// ============================================================
// NIGHTFALL PARTNERS — Mission HUD (Phase 3)
// Minimal, data-driven mission UI. The world dominates the
// screen: a slim objectives panel, a story-choice modal, and a
// MISSION COMPLETE overlay. Everything renders from engine
// snapshots — no mission-specific UI code.
// ============================================================

import React from 'react';

function ObjectiveRow({ o }) {
  const state = o.completed ? 'done' : o.available ? 'current' : 'upcoming';
  const showProgress = !o.completed && o.requiredProgress > 1;
  return (
    <div className={`mh-obj mh-${state}`}>
      <span className="mh-box">
        {o.completed ? '✓' : o.available ? '▢' : '□'}
      </span>
      <span className="mh-obj-body">
        <span className="mh-obj-title">
          {o.title}
          {!o.required && <span className="mh-opt"> · optional</span>}
        </span>
        {state === 'current' && <span className="mh-obj-desc">{o.description}</span>}
        {showProgress && (
          <span className="mh-obj-progress">{o.progress}/{o.requiredProgress}</span>
        )}
      </span>
    </div>
  );
}

export default function MissionHUD({ snap, onRestart }) {
  if (!snap) return null;
  const complete = snap.status === 'complete';

  return (
    <div className="mission-hud">
      {/* objectives tracker */}
      <div className="mh-panel forest-hud-child">
        <div className="mh-label">CURRENT MISSION · Chapter {snap.chapter}</div>
        <div className="mh-title">{snap.title}</div>
        {snap.mainObjective && !complete && (
          <div className="mh-main">{snap.mainObjective.title}</div>
        )}
        <div className="mh-list">
          {snap.objectives.map((o) => (
            <ObjectiveRow key={o.id} o={o} />
          ))}
        </div>
      </div>

      {/* story choice modal — engine-driven, branching-ready */}
      {snap.choice && !complete && (
        <div className="mh-choice-overlay">
          <div className="mh-choice">
            <div className="mh-label">THE RING OF STONES</div>
            <p className="mh-choice-prompt">{snap.choice.prompt}</p>
            {snap.choice.options.map((opt) => (
              <button
                key={opt.id}
                className="mh-choice-btn"
                onClick={() => snap.onChoose?.(snap.choice.id, opt.id)}
              >
                <span className="mh-choice-label">{opt.label}</span>
                <span className="mh-choice-desc">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MISSION COMPLETE */}
      {complete && (
        <div className="mh-complete-overlay">
          <div className="mh-complete">
            <div className="mh-complete-star">✦</div>
            <div className="mh-complete-title">MISSION COMPLETE</div>
            <div className="mh-complete-mission">{snap.title}</div>
            <div className="mh-complete-rewards">
              +{snap.complete?.rewards?.points ?? 0} points
              {snap.complete?.rewards?.flavor ? (
                <span className="mh-complete-flavor"> — {snap.complete.rewards.flavor}</span>
              ) : null}
            </div>
            {snap.complete?.nextMission && (
              <div className="mh-complete-next">Next night unlocked: {snap.complete.nextMission}</div>
            )}
            <button className="mh-restart" onClick={onRestart}>Play again</button>
          </div>
        </div>
      )}
    </div>
  );
}
