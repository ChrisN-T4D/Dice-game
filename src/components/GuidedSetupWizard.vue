<template>
  <div class="guided-setup-wizard" :class="{ 'wizard-step-last-active': step === totalSteps }">
    <Teleport to="#step-bar-portal">
      <div class="wizard-progress-inner">
        <span class="wizard-progress-text">Step {{ step }} of {{ totalSteps }}</span>
        <div class="wizard-progress-bar">
          <div class="wizard-progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
      </div>
    </Teleport>
    <div class="wizard-body">

    <!-- Step 1: Session timing (phase split, length, turns & pauses) -->
    <div v-show="step === 1" class="wizard-step active wizard-step-phase-distribution">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Session timing</div>
        <div class="wizard-step-description">How long you play, how time is split across phases, and how turns are paced.</div>
      </div>
      <div class="wizard-step-content wizard-step-timing">
        <div class="wizard-settings-category">Phase split</div>
        <p class="wizard-settings-category-hint">Choose an option below, or pick Custom to set your own percentages.</p>
        <div class="wizard-options-card">
          <div class="row wrap">
            <button v-for="opt in phaseOptions" :key="opt.value" type="button" class="secondary wizard-opt" :class="{ 'preset-selected': config.distributionMode === opt.value }" @click="selectPhaseOption(opt)">
              <span class="wizard-opt-label">{{ opt.label }}</span>
              <span class="wizard-opt-sub">{{ opt.sub }}</span>
            </button>
          </div>
        </div>
        <div class="wizard-collapsible">
          <button
            type="button"
            class="wizard-collapsible-toggle"
            :aria-expanded="!!wizardExplainOpen.s1"
            @click="toggleWizardExplain('s1')"
          >
            <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s1 ? '▼' : '▶' }}</span>
            Explain these options
          </button>
          <div v-show="wizardExplainOpen.s1" class="wizard-collapsible-panel">
            <ul class="wizard-collapsible-list">
              <li v-for="opt in phaseOptions" :key="'ex1-' + opt.value">
                <strong>{{ opt.label }}:</strong> {{ opt.detail }}
              </li>
            </ul>
          </div>
        </div>
        <div v-if="config.distributionMode === 'custom'" class="custom-sliders custom-sliders-compact">
          <div class="row align-center"><label>Phase 1</label><span class="pct">{{ config.phasePercents[0] }}%</span><input v-model.number="config.phasePercents[0]" type="range" min="0" max="100" /></div>
          <div class="row align-center"><label>Phase 2</label><span class="pct">{{ config.phasePercents[1] }}%</span><input v-model.number="config.phasePercents[1]" type="range" min="0" max="100" /></div>
          <div class="row align-center"><label>Phase 3</label><span class="pct">{{ config.phasePercents[2] }}%</span><input v-model.number="config.phasePercents[2]" type="range" min="0" max="100" /></div>
        </div>

        <div class="wizard-settings-category">Session length</div>
        <div class="wizard-options-card">
          <div class="row wrap">
            <button v-for="m in [15, 30, 45, 60, 90, 120]" :key="m" type="button" class="secondary wizard-opt" :class="{ 'preset-selected': config.totalMinutes === m }" @click="config.totalMinutes = m">{{ m }} min</button>
          </div>
        </div>
        <div class="wizard-collapsible">
          <button
            type="button"
            class="wizard-collapsible-toggle"
            :aria-expanded="!!wizardExplainOpen.s2"
            @click="toggleWizardExplain('s2')"
          >
            <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s2 ? '▼' : '▶' }}</span>
            Explain these lengths
          </button>
          <div v-show="wizardExplainOpen.s2" class="wizard-collapsible-panel">
            <ul class="wizard-collapsible-list">
              <li><strong>15 min:</strong> Short structured session, good for a quick check-in.</li>
              <li><strong>30–45 min:</strong> Common choices with room to settle in without a huge time commitment.</li>
              <li><strong>60–90 min:</strong> Longer sessions when you want more turns and slower pacing.</li>
              <li><strong>120 min:</strong> A full two-hour arc; phases still follow the split you chose above.</li>
            </ul>
          </div>
        </div>

        <div class="wizard-settings-category">Turns & pauses</div>
        <label>Turn duration</label>
        <div class="wizard-options-card">
          <div class="row wrap">
            <button v-for="m in [1, 2, 3, 5]" :key="m" type="button" class="secondary wizard-opt" :class="{ 'preset-selected': config.turnMinutes === m }" @click="config.turnMinutes = m">{{ m }} min</button>
          </div>
        </div>
        <label class="mt">Pause between turns</label>
        <div class="wizard-options-card">
          <div class="row wrap">
            <button v-for="s in pauseOptions" :key="s.v" type="button" class="secondary wizard-opt" :class="{ 'preset-selected': config.pauseSeconds === s.v }" @click="config.pauseSeconds = s.v">{{ s.label }}</button>
          </div>
        </div>
        <div class="wizard-collapsible">
          <button
            type="button"
            class="wizard-collapsible-toggle"
            :aria-expanded="!!wizardExplainOpen.s3"
            @click="toggleWizardExplain('s3')"
          >
            <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s3 ? '▼' : '▶' }}</span>
            Explain turn length and pause
          </button>
          <div v-show="wizardExplainOpen.s3" class="wizard-collapsible-panel">
            <p><strong>Turn duration</strong> is how long each partner’s active turn runs before you switch roles.</p>
            <ul class="wizard-collapsible-list wizard-collapsible-list-tight">
              <li><strong>1 min:</strong> Quick turns; more switches per phase.</li>
              <li><strong>2 min:</strong> A balanced default for many sessions.</li>
              <li><strong>3 min:</strong> Longer stretches in each role.</li>
              <li><strong>5 min:</strong> Very slow turnover; fewer role changes in the same total time.</li>
            </ul>
            <p class="wizard-collapsible-panel-gap"><strong>Pause between turns</strong> adds optional quiet time so you can move, adjust, or check in.</p>
            <ul class="wizard-collapsible-list wizard-collapsible-list-tight">
              <li v-for="s in pauseOptions" :key="'ex3-' + s.v"><strong>{{ s.label }}:</strong> {{ s.detail }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2: Prompts & comfort -->
    <div v-show="step === 2" class="wizard-step active wizard-step-prompts">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Prompts & comfort</div>
        <div class="wizard-step-description">How prompts sound, what they can suggest, and areas to leave out.</div>
      </div>
      <div class="wizard-step-content wizard-step-options">
        <div class="wizard-settings-category">Wording</div>
        <div class="wizard-option-row">
          <span class="wizard-option-label">Prompt detail</span>
          <div class="wizard-options-card">
            <div class="row wrap">
              <button
                v-for="opt in promptDetailOptions"
                :key="opt.id"
                type="button"
                class="secondary wizard-opt"
                :class="{ 'preset-selected': prefs.promptDetailMode === opt.id }"
                :title="opt.title"
                @click="prefs.setPromptDetail(opt.id)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div class="wizard-collapsible">
            <button
              type="button"
              class="wizard-collapsible-toggle"
              :aria-expanded="!!wizardExplainOpen.s5prompt"
              @click="toggleWizardExplain('s5prompt')"
            >
              <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s5prompt ? '▼' : '▶' }}</span>
              Explain prompt detail levels
            </button>
            <div v-show="wizardExplainOpen.s5prompt" class="wizard-collapsible-panel">
              <ul class="wizard-collapsible-list">
                <li v-for="opt in promptDetailOptions" :key="'hint-' + opt.id">
                  <strong>{{ opt.label }}:</strong> {{ opt.blurb }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div class="wizard-settings-category">What Phase 3 can suggest</div>
        <div class="wizard-option-row">
          <span class="wizard-option-label">Penetration</span>
          <div class="wizard-options-card">
            <div class="row">
              <button type="button" class="secondary wizard-opt" :class="{ 'preset-selected': prefs.penetrationPreference === 'prefer' }" @click="prefs.setPenetration('prefer')">Prefer penetration</button>
              <button type="button" class="secondary wizard-opt" :class="{ 'preset-selected': prefs.penetrationPreference === 'minimal' }" @click="prefs.setPenetration('minimal')">Minimal penetration</button>
            </div>
          </div>
          <div class="wizard-collapsible">
            <button
              type="button"
              class="wizard-collapsible-toggle"
              :aria-expanded="!!wizardExplainOpen.s5pen"
              @click="toggleWizardExplain('s5pen')"
            >
              <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s5pen ? '▼' : '▶' }}</span>
              Explain penetration options
            </button>
            <div v-show="wizardExplainOpen.s5pen" class="wizard-collapsible-panel">
              <p>
                <strong>Prefer penetration:</strong> Phase 3 prompts can favor intercourse-friendly suggestions more often, when your
                other settings allow them.
              </p>
              <p class="wizard-collapsible-panel-gap">
                <strong>Minimal penetration:</strong> Keeps penetration lighter and leans toward other kinds of touch and positions.
              </p>
            </div>
          </div>
        </div>
        <div class="wizard-option-row">
          <span class="wizard-option-label">Include anal-only positions (distinct from rear-entry vaginal)</span>
          <div class="wizard-options-card">
            <div class="row">
              <button type="button" class="secondary wizard-opt" :class="{ 'preset-selected': prefs.analPositionsEnabled }" @click="prefs.analPositionsEnabled = true">Yes</button>
              <button type="button" class="secondary wizard-opt" :class="{ 'preset-selected': !prefs.analPositionsEnabled }" @click="prefs.analPositionsEnabled = false">No</button>
            </div>
          </div>
          <div class="wizard-collapsible">
            <button
              type="button"
              class="wizard-collapsible-toggle"
              :aria-expanded="!!wizardExplainOpen.s5anal"
              @click="toggleWizardExplain('s5anal')"
            >
              <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s5anal ? '▼' : '▶' }}</span>
              Explain anal-only positions
            </button>
            <div v-show="wizardExplainOpen.s5anal" class="wizard-collapsible-panel">
              <p>
                <strong>Yes:</strong> The plan can suggest positions that are specifically anal intercourse, separate from rear-entry
                vaginal positions.
              </p>
              <p class="wizard-collapsible-panel-gap">
                <strong>No:</strong> Those anal-only prompts are left out; other positions are unchanged.
              </p>
            </div>
          </div>
        </div>
        <div class="wizard-option-row">
          <span class="wizard-option-label">Include vibrator/toy modifiers in Phase 3</span>
          <div class="wizard-options-card">
            <div class="row">
              <button type="button" class="secondary wizard-opt" :class="{ 'preset-selected': prefs.vibratorsPresent }" @click="prefs.vibratorsPresent = true">Yes</button>
              <button type="button" class="secondary wizard-opt" :class="{ 'preset-selected': !prefs.vibratorsPresent }" @click="prefs.vibratorsPresent = false">No</button>
            </div>
          </div>
          <div class="wizard-collapsible">
            <button
              type="button"
              class="wizard-collapsible-toggle"
              :aria-expanded="!!wizardExplainOpen.s5vibe"
              @click="toggleWizardExplain('s5vibe')"
            >
              <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s5vibe ? '▼' : '▶' }}</span>
              Explain toy modifiers
            </button>
            <div v-show="wizardExplainOpen.s5vibe" class="wizard-collapsible-panel">
              <p>
                <strong>Yes:</strong> Phase 3 can add optional vibrator or toy wording to some prompts when it fits the roll.
              </p>
              <p class="wizard-collapsible-panel-gap"><strong>No:</strong> Those toy-specific modifiers are skipped.</p>
            </div>
          </div>
        </div>
        <div class="wizard-settings-category">Voice</div>
        <div class="wizard-option-row wizard-option-row-voice">
          <span class="wizard-option-label">Voice for this session</span>
          <div class="wizard-options-card wizard-options-card-voice">
            <select v-model="config.kokoroVoiceId" class="wizard-select-voice" aria-label="Kokoro voice for guided session">
              <option v-if="!kokoroVoicesList.length" :value="config.kokoroVoiceId">Default voice (list loading…)</option>
              <option v-for="v in kokoroVoicesList" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
          </div>
          <div class="wizard-collapsible">
            <button
              type="button"
              class="wizard-collapsible-toggle"
              :aria-expanded="!!wizardExplainOpen.s5voice"
              @click="toggleWizardExplain('s5voice')"
            >
              <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s5voice ? '▼' : '▶' }}</span>
              Explain voice selection
            </button>
            <div v-show="wizardExplainOpen.s5voice" class="wizard-collapsible-panel">
              <p>
                This voice is used when the app generates spoken prompts with Kokoro. When a line matches pre-recorded audio, the app
                may use that clip instead when the voice lines up.
              </p>
            </div>
          </div>
        </div>
        <div class="wizard-settings-category">Comfort filters</div>
        <div class="wizard-option-row wizard-option-row-body">
          <span class="wizard-option-label">Avoid prompts involving…</span>
          <div class="wizard-body-exclude-grid">
            <div class="wizard-body-exclude-col">
              <div class="wizard-body-exclude-heading">When you are touching</div>
              <div class="wizard-options-card wizard-body-exclude-card">
                <button
                  v-for="key in excludeBodyKeys"
                  :key="'touch-' + key"
                  type="button"
                  class="secondary wizard-opt wizard-exclude-btn"
                  :class="{ 'preset-selected': prefs.excludeWhenTouching[key] }"
                  @click="toggleExcludeTouching(key)"
                >
                  {{ bodyExcludeLabels[key] }}
                </button>
              </div>
            </div>
            <div class="wizard-body-exclude-col">
              <div class="wizard-body-exclude-heading">When you are touched</div>
              <div class="wizard-options-card wizard-body-exclude-card">
                <button
                  v-for="key in excludeBodyKeys"
                  :key="'touched-' + key"
                  type="button"
                  class="secondary wizard-opt wizard-exclude-btn"
                  :class="{ 'preset-selected': prefs.excludeWhenTouched[key] }"
                  @click="toggleExcludeTouched(key)"
                >
                  {{ bodyExcludeLabels[key] }}
                </button>
              </div>
            </div>
          </div>
          <div class="wizard-collapsible">
            <button
              type="button"
              class="wizard-collapsible-toggle"
              :aria-expanded="!!wizardExplainOpen.s5body"
              @click="toggleWizardExplain('s5body')"
            >
              <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s5body ? '▼' : '▶' }}</span>
              Explain body-area filters
            </button>
            <div v-show="wizardExplainOpen.s5body" class="wizard-collapsible-panel">
              <p>
                Tap a region to exclude it from random rolls. <strong>When you are touching</strong> applies while you are the giver;
                <strong>When you are touched</strong> applies while you are receiving. Selected areas are avoided in Phase 1 and 2
                prompts; Phase 3 uses different rules but still respects your comfort choices where the app can.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: Intimacy positions + between-phase check-in -->
    <div v-show="step === 3" class="wizard-step active wizard-step-phase3">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Phases & intimacy flow</div>
        <div class="wizard-step-description">
          How often the suggested position changes in the intimacy phase, and an optional pause between phases.
        </div>
      </div>
      <div class="wizard-step-content">
        <div class="wizard-settings-category">Intimacy positions (Phase 3)</div>
        <p class="wizard-settings-category-hint">How often the suggested physical position changes in the intimacy phase.</p>
        <div class="wizard-collapsible">
          <button
            type="button"
            class="wizard-collapsible-toggle"
            :aria-expanded="!!wizardExplainOpen.s4"
            @click="toggleWizardExplain('s4')"
          >
            <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s4 ? '▼' : '▶' }}</span>
            About Phase 3 and these choices
          </button>
          <div v-show="wizardExplainOpen.s4" class="wizard-collapsible-panel wizard-collapsible-panel-phase3">
            <p>
              Phase 3 is the intimacy phase. Prompts here emphasize partnered intercourse and direct genital pleasure, within the
              prompt and comfort choices you set on the previous step.
            </p>
            <p>
              You still take turns as giver and receiver, and each turn still gets fresh activity details. The choices on this step
              control how often the suggested body position changes. (How bold positions can be is set on the <strong>Clothing removal</strong> step.)
            </p>
            <ul class="wizard-collapsible-list">
              <li><strong>Every turn:</strong> A new suggested position whenever the turn changes.</li>
              <li><strong>Every two turns:</strong> Same position for two turns so each partner leads once there, then advance.</li>
              <li>
                <strong>Several turns per position:</strong> Stay longer in each position; rotation size is set below, and turns per
                position are estimated from your session length and phase split.
              </li>
            </ul>
          </div>
        </div>
        <label>When should the position change?</label>
        <div class="wizard-options-card">
          <div class="wizard-phase3-mode-col">
            <button
              type="button"
              class="secondary wizard-opt wizard-opt-stack"
              :class="{ 'preset-selected': config.phase3PositionMode === 'each_turn' }"
              @click="config.phase3PositionMode = 'each_turn'"
            >
              <span class="wizard-opt-label">Every turn</span>
              <span class="wizard-opt-sub">Suggest a new position whenever the turn changes. This is the usual behavior.</span>
            </button>
            <button
              type="button"
              class="secondary wizard-opt wizard-opt-stack"
              :class="{ 'preset-selected': config.phase3PositionMode === 'reuse_rotate' }"
              @click="config.phase3PositionMode = 'reuse_rotate'"
            >
              <span class="wizard-opt-label">Every two turns</span>
              <span class="wizard-opt-sub">
                Keep the same position for two turns so each partner can lead once in that position, then move on. Activity details
                still change every turn.
              </span>
            </button>
            <button
              type="button"
              class="secondary wizard-opt wizard-opt-stack"
              :class="{ 'preset-selected': config.phase3PositionMode === 'reuse_multi' }"
              @click="config.phase3PositionMode = 'reuse_multi'"
            >
              <span class="wizard-opt-label">Several turns per position</span>
              <span class="wizard-opt-sub">
                Stay in one suggested position for several turns before moving to the next slot in the rotation. Activity details still
                change every turn. How long you stay in each position is estimated from your total time, phase split, turn length, and
                how many positions you allow below.
              </span>
            </button>
          </div>
        </div>
        <template v-if="config.phase3PositionMode === 'reuse_multi'">
          <label class="mt">How many positions in the Phase 3 rotation?</label>
          <div class="wizard-options-card">
            <div class="row wrap">
              <button
                v-for="n in phase3MaxPositionOptions"
                :key="'p3max-' + n"
                type="button"
                class="secondary wizard-opt"
                :class="{ 'preset-selected': config.phase3MaxPositions === n }"
                @click="config.phase3MaxPositions = n"
              >
                {{ n }}
              </button>
            </div>
          </div>
          <div class="wizard-collapsible">
            <button
              type="button"
              class="wizard-collapsible-toggle"
              :aria-expanded="!!wizardExplainOpen.s4rot"
              @click="toggleWizardExplain('s4rot')"
            >
              <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s4rot ? '▼' : '▶' }}</span>
              Explain rotation size
            </button>
            <div v-show="wizardExplainOpen.s4rot" class="wizard-collapsible-panel">
              <p>
                We pick up to this many compatible positions in random order, or fewer if your settings do not allow that many. When the
                list ends, it starts over.
              </p>
              <p class="wizard-collapsible-panel-gap">
                The app estimates how many turns fit in Phase 3 from your total session time, your phase time percentages, turn length,
                and the fixed break between turns. It spreads those turns across this rotation size so each position lasts several turns
                in a row (at least three when the numbers allow).
              </p>
            </div>
          </div>
        </template>

        <div class="wizard-settings-category wizard-settings-category-major">Between phases</div>
        <p class="wizard-settings-category-hint">Pause between phases to check in with each other before continuing?</p>
        <div class="wizard-options-card">
          <div class="wizard-phase-checkin-actions wizard-phase-checkin-actions-inline">
            <button type="button" class="secondary wizard-phase-checkin-btn" :class="{ 'preset-selected': config.phaseCheckInEnabled }" @click="config.phaseCheckInEnabled = true">Yes</button>
            <button type="button" class="secondary wizard-phase-checkin-btn" :class="{ 'preset-selected': !config.phaseCheckInEnabled }" @click="config.phaseCheckInEnabled = false">No</button>
          </div>
        </div>
        <div class="wizard-collapsible">
          <button
            type="button"
            class="wizard-collapsible-toggle"
            :aria-expanded="!!wizardExplainOpen.s11"
            @click="toggleWizardExplain('s11')"
          >
            <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s11 ? '▼' : '▶' }}</span>
            Explain phase check-in
          </button>
          <div v-show="wizardExplainOpen.s11" class="wizard-collapsible-panel">
            <p>
              <strong>Yes:</strong> After each phase ends, the session pauses so you can check in before you continue. You tap when you
              are both ready.
            </p>
            <p class="wizard-collapsible-panel-gap">
              <strong>No:</strong> Phases flow into each other without that extra pause screen.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Steps 4–8: Clothing removal, both partners, and their clothing lists -->
    <!-- Step 4: Clothing removal -->
    <div v-show="step === 4" class="wizard-step active">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Clothing removal</div>
        <div class="wizard-step-description">
          Phase 3 position intensity for this session, then whether clothing-removal prompts can appear in Phases 1 and 2.
        </div>
      </div>
      <div class="wizard-step-content">
        <div class="wizard-settings-category wizard-settings-category-major">Phase 3 position intensity (this session)</div>
        <p class="wizard-settings-category-hint">
          How bold can suggested positions be in the intimacy phase? Calmer stays closer to the bed; full variety can include standing,
          carrying, and other higher-effort ideas when rolls allow. (Sensate-style sessions use their own script.)
        </p>
        <div class="wizard-option-row">
          <span class="wizard-option-label">Choose one</span>
          <div class="wizard-options-card">
            <div class="row wrap">
              <button
                type="button"
                class="secondary wizard-opt"
                :class="{ 'preset-selected': config.positionIntensity === 'bed_only' }"
                @click="config.positionIntensity = 'bed_only'"
              >
                Calmer / bed-focused
              </button>
              <button
                type="button"
                class="secondary wizard-opt"
                :class="{ 'preset-selected': config.positionIntensity === 'more_physical' }"
                @click="config.positionIntensity = 'more_physical'"
              >
                Full variety
              </button>
            </div>
          </div>
          <div class="wizard-collapsible">
            <button
              type="button"
              class="wizard-collapsible-toggle"
              :aria-expanded="!!wizardExplainOpen.s4p3intensity"
              @click="toggleWizardExplain('s4p3intensity')"
            >
              <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s4p3intensity ? '▼' : '▶' }}</span>
              Explain position intensity
            </button>
            <div v-show="wizardExplainOpen.s4p3intensity" class="wizard-collapsible-panel">
              <p>
                The catalog tags each pose by effort level. <strong>Calmer / bed-focused</strong> skips positions that usually need
                standing, carrying, or heavy balance. <strong>Full variety</strong> keeps the full compatible pool. This only affects
                Phase 3; Phases 1 and 2 use touch and activity prompts.
              </p>
            </div>
          </div>
        </div>

        <div class="wizard-settings-category">Clothing removal during Phase 1 &amp; 2</div>
        <div class="wizard-options-card">
          <div class="row">
            <button type="button" class="secondary wizard-opt" :class="{ 'preset-selected': config.clothingEnabled }" @click="config.clothingEnabled = true">Enabled</button>
            <button type="button" class="secondary wizard-opt" :class="{ 'preset-selected': !config.clothingEnabled }" @click="config.clothingEnabled = false">Disabled</button>
          </div>
        </div>
        <div class="wizard-collapsible">
          <button
            type="button"
            class="wizard-collapsible-toggle"
            :aria-expanded="!!wizardExplainOpen.s6"
            @click="toggleWizardExplain('s6')"
          >
            <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s6 ? '▼' : '▶' }}</span>
            Explain clothing removal
          </button>
          <div v-show="wizardExplainOpen.s6" class="wizard-collapsible-panel">
            <p>
              <strong>Enabled:</strong> During Phase 1 and 2, some turns can include optional clothing removal prompts tied to items you
              list for each partner.
            </p>
            <p class="wizard-collapsible-panel-gap">
              <strong>Disabled:</strong> No removal prompts; you skip straight to partner and clothing item setup without that layer.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 5: Partner 1 -->
    <div v-show="step === 5" class="wizard-step active wizard-step-partner">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Partner 1</div>
        <div class="wizard-step-description">Name, color, and anatomy</div>
      </div>
      <div class="wizard-step-content">
        <label>Name</label>
        <input v-model="config.partnerNames[1]" type="text" placeholder="Partner 1" maxlength="30" class="wizard-input" />
        <label class="mt">Color</label>
        <div class="row color-dots">
          <span
            v-for="c in colors"
            :key="c"
            class="color-dot"
            :class="{ selected: config.partnerColors[1] === c }"
            :style="{ background: c }"
            @click="config.partnerColors[1] = c"
          ></span>
        </div>
        <label class="mt">Anatomy</label>
        <div class="wizard-options-card">
          <div class="row">
            <button type="button" class="secondary wizard-opt" :class="{ 'preset-selected': config.partnerAnatomy[1] === 'penis' }" @click="config.partnerAnatomy[1] = 'penis'">Penis & scrotum</button>
            <button type="button" class="secondary wizard-opt" :class="{ 'preset-selected': config.partnerAnatomy[1] === 'vulva' }" @click="config.partnerAnatomy[1] = 'vulva'">Vulva</button>
          </div>
        </div>
        <div class="wizard-collapsible">
          <button
            type="button"
            class="wizard-collapsible-toggle"
            :aria-expanded="!!wizardExplainOpen.s7"
            @click="toggleWizardExplain('s7')"
          >
            <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s7 ? '▼' : '▶' }}</span>
            Explain partner fields
          </button>
          <div v-show="wizardExplainOpen.s7" class="wizard-collapsible-panel">
            <p>
              <strong>Name</strong> is optional and is used in on-screen text and spoken prompts where the app substitutes partner
              labels.
            </p>
            <p class="wizard-collapsible-panel-gap">
              <strong>Color</strong> helps you tell partners apart in the UI during the session.
            </p>
            <p class="wizard-collapsible-panel-gap">
              <strong>Anatomy</strong> steers which touch and Phase 3 position pools apply for that partner as receiver, so prompts match
              your bodies.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 6: Partner 1 clothing -->
    <div v-show="step === 6" class="wizard-step active">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Partner 1 – clothing</div>
        <div class="wizard-step-description">Pick a starting outfit, then add or remove items as you like.</div>
      </div>
      <div class="wizard-step-content">
        <template v-if="config.clothingEnabled">
          <label>Starting outfit</label>
          <div class="wizard-options-card">
          <div class="row wrap clothing-presets">
            <button
              v-for="preset in presetNames"
              :key="'p1-' + preset"
              type="button"
              class="clothing-preset-btn"
              :class="{ 'preset-selected': listMatchesPreset(config.clothingListP1, preset) }"
              :title="preset"
              @click="setPreset(1, preset)"
            >
              <span class="clothing-preset-icon">{{ presetIcon(preset) }}</span>
              {{ presetLabel(preset) }}
            </button>
          </div>
          </div>
          <div class="clothing-list-by-body mt">
            <div class="wizard-collapsible">
              <button
                type="button"
                class="wizard-collapsible-toggle"
                :aria-expanded="!!wizardExplainOpen.s8"
                @click="toggleWizardExplain('s8')"
              >
                <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s8 ? '▼' : '▶' }}</span>
                How clothing selection works
              </button>
              <div v-show="wizardExplainOpen.s8" class="wizard-collapsible-panel">
                <p>
                  Choose a starting outfit to load a list, then tap any item to turn it on or off. The list is grouped by body region
                  from head to toe so you can mirror what each partner is wearing.
                </p>
              </div>
            </div>
            <div v-for="grp in fullClothingGroups" :key="'p1-full-' + grp.region" class="clothing-region">
              <div class="clothing-region-label">{{ grp.label }}</div>
              <div class="clothing-region-items">
                <button
                  v-for="item in grp.items"
                  :key="'p1-' + item"
                  type="button"
                  class="clothing-item-btn"
                  :class="{ 'preset-selected': config.clothingListP1.includes(item) }"
                  @click="toggleClothingItem(1, item)"
                >
                  <span class="clothing-item-icon">{{ getClothingEmoji(item) }}</span>
                  {{ item }}
                </button>
              </div>
            </div>
          </div>
        </template>
        <p v-else class="wizard-step-description">Clothing is disabled. Enable it on the clothing step to choose items.</p>
      </div>
    </div>

    <!-- Step 7: Partner 2 -->
    <div v-show="step === 7" class="wizard-step active wizard-step-partner">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Partner 2</div>
        <div class="wizard-step-description">Name, color, and anatomy</div>
      </div>
      <div class="wizard-step-content">
        <label>Name</label>
        <input v-model="config.partnerNames[2]" type="text" placeholder="Partner 2" maxlength="30" class="wizard-input" />
        <label class="mt">Color</label>
        <div class="row color-dots">
          <span
            v-for="c in colors"
            :key="c"
            class="color-dot"
            :class="{ selected: config.partnerColors[2] === c }"
            :style="{ background: c }"
            @click="config.partnerColors[2] = c"
          ></span>
        </div>
        <label class="mt">Anatomy</label>
        <div class="wizard-options-card">
          <div class="row">
            <button type="button" class="secondary wizard-opt" :class="{ 'preset-selected': config.partnerAnatomy[2] === 'penis' }" @click="config.partnerAnatomy[2] = 'penis'">Penis & scrotum</button>
            <button type="button" class="secondary wizard-opt" :class="{ 'preset-selected': config.partnerAnatomy[2] === 'vulva' }" @click="config.partnerAnatomy[2] = 'vulva'">Vulva</button>
          </div>
        </div>
        <div class="wizard-collapsible">
          <button
            type="button"
            class="wizard-collapsible-toggle"
            :aria-expanded="!!wizardExplainOpen.s9"
            @click="toggleWizardExplain('s9')"
          >
            <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s9 ? '▼' : '▶' }}</span>
            Explain partner fields
          </button>
          <div v-show="wizardExplainOpen.s9" class="wizard-collapsible-panel">
            <p>
              Same as Partner 1: <strong>name</strong> for labels in text and audio, <strong>color</strong> for the UI, and
              <strong>anatomy</strong> for which prompts and positions apply when this partner receives.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 8: Partner 2 clothing -->
    <div v-show="step === 8" class="wizard-step active">
      <div class="wizard-step-header">
        <div class="wizard-step-title">Partner 2 – clothing</div>
        <div class="wizard-step-description">Pick a starting outfit, then add or remove items as you like.</div>
      </div>
      <div class="wizard-step-content">
        <template v-if="config.clothingEnabled">
          <label>Starting outfit</label>
          <div class="wizard-options-card">
          <div class="row wrap clothing-presets">
            <button
              v-for="preset in presetNames"
              :key="'p2-' + preset"
              type="button"
              class="clothing-preset-btn"
              :class="{ 'preset-selected': listMatchesPreset(config.clothingListP2, preset) }"
              :title="preset"
              @click="setPreset(2, preset)"
            >
              <span class="clothing-preset-icon">{{ presetIcon(preset) }}</span>
              {{ presetLabel(preset) }}
            </button>
          </div>
          </div>
          <div class="clothing-list-by-body mt">
            <div class="wizard-collapsible">
              <button
                type="button"
                class="wizard-collapsible-toggle"
                :aria-expanded="!!wizardExplainOpen.s10"
                @click="toggleWizardExplain('s10')"
              >
                <span class="wizard-collapsible-chevron" aria-hidden="true">{{ wizardExplainOpen.s10 ? '▼' : '▶' }}</span>
                How clothing selection works
              </button>
              <div v-show="wizardExplainOpen.s10" class="wizard-collapsible-panel">
                <p>
                  Same as Partner 1: a starting outfit loads a list; tap items to include or exclude them for removal prompts in Phase
                  1 and 2.
                </p>
              </div>
            </div>
            <div v-for="grp in fullClothingGroups" :key="'p2-full-' + grp.region" class="clothing-region">
              <div class="clothing-region-label">{{ grp.label }}</div>
              <div class="clothing-region-items">
                <button
                  v-for="item in grp.items"
                  :key="'p2-' + item"
                  type="button"
                  class="clothing-item-btn"
                  :class="{ 'preset-selected': config.clothingListP2.includes(item) }"
                  @click="toggleClothingItem(2, item)"
                >
                  <span class="clothing-item-icon">{{ getClothingEmoji(item) }}</span>
                  {{ item }}
                </button>
              </div>
            </div>
          </div>
        </template>
        <p v-else class="wizard-step-description">Clothing is disabled. Enable it on the clothing step to choose items.</p>
      </div>
    </div>
    </div>

    <Teleport to="#bottom-nav-portal">
      <div class="wizard-navigation-inner">
        <button type="button" class="wizard-nav-btn back" :disabled="step <= 1" @click="step--">← Back</button>
        <button v-if="step < totalSteps" type="button" class="wizard-nav-btn next" @click="step++">Next →</button>
        <button v-else type="button" class="primary wizard-nav-btn" @click="onStart">Review session plan</button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { clothingPresets, getClothingEmoji, getClothingItemsByBody, groupClothingByBodyRegion, sortClothingByBodyRegion } from '@/data/clothing'
import { usePreferencesStore } from '@/stores/preferences'
import { useSpeech } from '@/composables/useSpeech'
import { EXCLUDE_BODY_KEYS, mergeExcludePrefs } from '@/utils/bodyPartRollExclusions'

const props = defineProps({
  initialStep: { type: Number, default: 1 },
  initialConfig: { type: Object, default: null },
})

const totalSteps = 8
const step = ref(1)
const progressPercent = computed(() => (step.value / totalSteps) * 100)

/** Collapsible “explain” panels default closed; keys are arbitrary per section. */
const wizardExplainOpen = reactive({})
function toggleWizardExplain(key) {
  wizardExplainOpen[key] = !wizardExplainOpen[key]
}

const colors = ['#3b82f6', '#22d3ee', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#f97316', '#ec4899', '#e5e7eb']

const phaseOptions = [
  {
    value: 'equal',
    label: 'Equal',
    sub: '33/33/34%',
    detail: 'Splits time evenly across Phase 1 (slower attentive touch), Phase 2 (warmer exploration), and Phase 3 (intimacy).',
  },
  {
    value: 'phase1',
    label: 'Slow build',
    sub: '50/30/20%',
    detail: 'More time in Phase 1 for a slow build with calm, present-moment touch; less in Phase 3.',
  },
  {
    value: 'phase2',
    label: 'A little spicy',
    sub: '30/40/30%',
    detail: 'Emphasizes Phase 2 for building heat before moving into Phase 3.',
  },
  {
    value: 'phase3',
    label: 'Intimacy-focused',
    sub: '20/30/50%',
    detail: 'More of the session in Phase 3 when prompts focus on partnered intimacy.',
  },
  {
    value: 'quickie',
    label: 'Quickie',
    sub: '10/30/60%',
    detail: 'A shorter overall session with most of the remaining time in Phase 3.',
  },
  {
    value: 'custom',
    label: 'Custom',
    sub: 'Set your own',
    detail: 'Set your own percentages with the sliders. Aim for about 100% across the three phases.',
  },
]

const phasePercentsByMode = {
  equal: [33, 33, 34],
  phase1: [50, 30, 20],
  phase2: [30, 40, 30],
  phase3: [20, 30, 50],
  quickie: [10, 30, 60],
  custom: [33, 33, 34],
}

const pauseOptions = [
  { v: 0, label: 'None', detail: 'Turns follow one after another with only the usual transition time.' },
  { v: 10, label: '10 sec', detail: 'A short breath between turns.' },
  { v: 15, label: '15 sec', detail: 'A little space to shift or reset before the next turn.' },
  { v: 30, label: '30 sec', detail: 'More time to stretch, hydrate, or talk before continuing.' },
  { v: 60, label: '1 min', detail: 'A full minute of pause between turns for a slower pace.' },
]

const phase3MaxPositionOptions = [1, 2, 3, 4, 5, 6, 7, 8]

const promptDetailOptions = [
  {
    id: 'beginner',
    label: 'Beginner',
    title: 'Fuller prompts with more guidance',
    blurb: 'Longer instructions and clearer wording, with gentle pacing cues so each step is easy to follow.',
  },
  {
    id: 'regular',
    label: 'Regular',
    title: 'Balanced length and detail',
    blurb: 'Medium detail and a steady pace. Works well as the default for most couples.',
  },
  {
    id: 'expert',
    label: 'Expert',
    title: 'Shorter, quicker prompts',
    blurb: 'Shorter lines and less explanation so you spend less time listening and move through turns faster.',
  },
]

const presetNames = Object.keys(clothingPresets)
/** Shorter labels for preset buttons so they fit better. */
const presetDisplayNames = {
  casual: 'Casual',
  dressCasual: 'Dress',
  lingerie: 'Lingerie',
  lingerieLace: 'Lace',
  lingerieClassic: 'Classic',
  minimal: 'Minimal',
  fullOutfit: 'Full',
  dateNight: 'Date',
  loungeWear: 'Lounge',
  athletic: 'Athletic',
  cozy: 'Cozy',
  layered: 'Layered',
  undergarmentsMale: 'Undies\nMale',
  undergarmentsFemale: 'Undies\nFemale',
  custom: 'Custom',
}
function presetLabel(key) {
  return presetDisplayNames[key] || key
}
/** Full list of clothing items grouped by body region (head to toe), for Custom mode. */
const fullClothingGroups = groupClothingByBodyRegion(getClothingItemsByBody())

const prefs = usePreferencesStore()
const speech = useSpeech()

const excludeBodyKeys = EXCLUDE_BODY_KEYS
const bodyExcludeLabels = {
  feet: 'Feet',
  licking: 'Licking / mouth',
  nipples: 'Nipples / chest',
  genitals: 'Genitals',
  buttocks: 'Buttocks',
  perineum: 'Perineum',
}

const kokoroVoicesList = computed(() => {
  const v = speech.kokoroVoicesListForLocale
  const list = (v && typeof v === 'object' && 'value' in v ? v.value : v) || []
  return Array.isArray(list) ? list : []
})

function toggleExcludeTouching(key) {
  prefs.$patch({
    excludeWhenTouching: { ...prefs.excludeWhenTouching, [key]: !prefs.excludeWhenTouching[key] },
  })
}
function toggleExcludeTouched(key) {
  prefs.$patch({
    excludeWhenTouched: { ...prefs.excludeWhenTouched, [key]: !prefs.excludeWhenTouched[key] },
  })
}

const config = reactive({
  partnerNames: { 1: '', 2: '' },
  partnerColors: { 1: '#3b82f6', 2: '#ec4899' },
  partnerAnatomy: { 1: 'penis', 2: 'vulva' },
  distributionMode: 'equal',
  phasePercents: [33, 33, 34],
  totalMinutes: 30,
  turnMinutes: 2,
  pauseSeconds: 15,
  clothingRemovalSeconds: 30,
  clothingEnabled: false,
  clothingListP1: [...clothingPresets.undergarmentsMale],
  clothingListP2: [...clothingPresets.undergarmentsFemale],
  phaseCheckInEnabled: false,
  kokoroVoiceId: 'af_nicole',
  phase3PositionMode: 'each_turn',
  phase3MaxPositions: 4,
  /** 'bed_only' | 'more_physical' — Phase 3 position pool for this guided session (wheelbarrow/standing vs calmer). */
  positionIntensity: 'more_physical',
})

function selectPhaseOption(opt) {
  config.distributionMode = opt.value
  config.phasePercents = [...phasePercentsByMode[opt.value]]
  if (opt.value === 'quickie') {
    config.totalMinutes = 15
    config.turnMinutes = 1
  }
}

function setPreset(partner, presetKey) {
  const list = clothingPresets[presetKey]
  if (!list) return
  if (partner === 1) config.clothingListP1 = [...list]
  else config.clothingListP2 = [...list]
}

function listMatchesPreset(list, presetKey) {
  if (!Array.isArray(list)) return false
  if (presetKey === 'custom') {
    if (list.length === 0) return true
    return !presetNames.some((p) => p !== 'custom' && listMatchesPreset(list, p))
  }
  const preset = clothingPresets[presetKey]
  if (!preset) return false
  if (list.length !== preset.length) return false
  const a = [...list].sort()
  const b = [...preset].sort()
  return a.every((item, i) => item === b[i])
}

function isCustomClothingMode(partner) {
  const list = partner === 1 ? config.clothingListP1 : config.clothingListP2
  return listMatchesPreset(list, 'custom')
}

function toggleClothingItem(partner, item) {
  const list = partner === 1 ? config.clothingListP1 : config.clothingListP2
  const idx = list.indexOf(item)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(item)
  const sorted = sortClothingByBodyRegion(list)
  if (partner === 1) config.clothingListP1 = [...sorted]
  else config.clothingListP2 = [...sorted]
}

function presetIcon(presetKey) {
  const list = clothingPresets[presetKey]
  if (!list || list.length === 0) return '👕'
  return getClothingEmoji(list[0])
}

const emit = defineEmits(['start'])

onMounted(() => {
  if (props.initialConfig) {
    const c = props.initialConfig
    config.totalMinutes = c.totalMinutes ?? 30
    config.turnMinutes = c.turnMinutes ?? 2
    config.pauseSeconds = c.pauseSeconds ?? 15
    config.clothingRemovalSeconds = c.clothingRemovalSeconds ?? 30
    config.phasePercents = Array.isArray(c.phasePercents) ? [...c.phasePercents] : [33, 33, 34]
    config.distributionMode = c.distributionMode ?? 'equal'
    config.clothingEnabled = !!c.clothingEnabled
    config.clothingListP1 = Array.isArray(c.clothingListP1) ? [...c.clothingListP1] : [...clothingPresets.undergarmentsMale]
    config.clothingListP2 = Array.isArray(c.clothingListP2) ? [...c.clothingListP2] : [...clothingPresets.undergarmentsFemale]
    config.phaseCheckInEnabled = !!c.phaseCheckInEnabled
    if (c.partnerNames) {
      config.partnerNames[1] = c.partnerNames[1] ?? ''
      config.partnerNames[2] = c.partnerNames[2] ?? ''
    }
    if (c.partnerAnatomy) {
      config.partnerAnatomy[1] = c.partnerAnatomy[1] ?? 'penis'
      config.partnerAnatomy[2] = c.partnerAnatomy[2] ?? 'vulva'
    }
    if (c.kokoroVoiceId) {
      const v = String(c.kokoroVoiceId).trim()
      if (v) config.kokoroVoiceId = v
    }
    if (c.excludeWhenTouching) prefs.$patch({ excludeWhenTouching: mergeExcludePrefs(c.excludeWhenTouching) })
    if (c.excludeWhenTouched) prefs.$patch({ excludeWhenTouched: mergeExcludePrefs(c.excludeWhenTouched) })
    if (typeof c.vibratorsPresent === 'boolean') prefs.vibratorsPresent = c.vibratorsPresent
    if (c.positionIntensity === 'bed_only' || c.positionIntensity === 'more_physical') {
      config.positionIntensity = c.positionIntensity
    } else {
      config.positionIntensity = prefs.positionIntensity === 'bed_only' ? 'bed_only' : 'more_physical'
    }
    if (c.phase3PositionMode === 'reuse_rotate' || c.phase3PositionMode === 'reuse_multi') {
      config.phase3PositionMode = c.phase3PositionMode
    } else {
      config.phase3PositionMode = 'each_turn'
    }
    const rawMax = c.phase3MaxPositions
    config.phase3MaxPositions =
      typeof rawMax === 'number' && rawMax >= 1 && rawMax <= 20 ? Math.round(rawMax) : 4
  } else {
    const kid = speech.kokoroVoiceId && typeof speech.kokoroVoiceId === 'object' && 'value' in speech.kokoroVoiceId
      ? speech.kokoroVoiceId.value
      : speech.kokoroVoiceId
    if (kid && typeof kid === 'string' && kid.trim()) config.kokoroVoiceId = kid.trim()
    config.positionIntensity = prefs.positionIntensity === 'bed_only' ? 'bed_only' : 'more_physical'
  }
  if (props.initialStep >= 1 && props.initialStep <= totalSteps) {
    step.value = props.initialStep
  }
})

function onStart() {
  const phasePercents = config.distributionMode === 'custom' ? [...config.phasePercents] : phasePercentsByMode[config.distributionMode]
  if (config.distributionMode === 'quickie') {
    config.totalMinutes = 15
    config.turnMinutes = 1
  }
  const positionIntensity = config.positionIntensity === 'bed_only' ? 'bed_only' : 'more_physical'
  prefs.setPositionIntensity(positionIntensity)
  emit('start', {
    totalMinutes: config.totalMinutes,
    turnMinutes: config.turnMinutes,
    pauseSeconds: config.pauseSeconds,
    clothingRemovalSeconds: config.clothingRemovalSeconds,
    phasePercents,
    clothingListP1: config.clothingEnabled ? config.clothingListP1 : [],
    clothingListP2: config.clothingEnabled ? config.clothingListP2 : [],
    clothingEnabled: config.clothingEnabled,
    distributionMode: config.distributionMode,
    partnerNames: { 1: config.partnerNames[1], 2: config.partnerNames[2] },
    partnerAnatomy: { 1: config.partnerAnatomy[1], 2: config.partnerAnatomy[2] },
    phaseCheckInEnabled: config.phaseCheckInEnabled,
    kokoroVoiceId: (config.kokoroVoiceId && String(config.kokoroVoiceId).trim()) || 'af_nicole',
    excludeWhenTouching: mergeExcludePrefs(prefs.excludeWhenTouching),
    excludeWhenTouched: mergeExcludePrefs(prefs.excludeWhenTouched),
    vibratorsPresent: !!prefs.vibratorsPresent,
    positionIntensity,
    phase3PositionMode:
      config.phase3PositionMode === 'reuse_rotate' || config.phase3PositionMode === 'reuse_multi'
        ? config.phase3PositionMode
        : 'each_turn',
    phase3MaxPositions: Math.max(1, Math.min(20, Number(config.phase3MaxPositions) || 4)),
  })
}
</script>

<style scoped>
.guided-setup-wizard {
  padding: 0;
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
/* When the last step is active, wizard body centers phase-check-in vertically */
.guided-setup-wizard.wizard-step-last-active .wizard-body {
  display: flex;
  justify-content: center;
}
.wizard-body {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 0 1rem;
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: rgba(71, 85, 105, 0.5) transparent;
}
/* Each step fills the body and centers its content vertically when there's extra space */
.wizard-step {
  flex: 1;
  min-height: min-content;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 0;
  box-sizing: border-box;
}
/* Card around a single button group only (title/description stay outside) */
.wizard-options-card {
  width: 100%;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
  background: rgba(2, 6, 23, 0.6);
  border: 1px solid #334155;
  border-radius: 0.75rem;
  padding: 0.75rem;
  box-sizing: border-box;
}
.wizard-options-card .row {
  justify-content: center;
  gap: 0.5rem;
}
.wizard-body::-webkit-scrollbar {
  width: 6px;
}
.wizard-body::-webkit-scrollbar-track {
  background: transparent;
}
.wizard-body::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
}
.wizard-body:hover::-webkit-scrollbar-thumb,
.wizard-body:focus-within::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.5);
}
.wizard-body::-webkit-scrollbar-thumb:hover {
  background: rgba(71, 85, 105, 0.75);
}
.wizard-progress-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.wizard-progress-text { font-size: 0.85rem; color: #9ca3af; font-weight: 600; }
.wizard-progress-bar {
  height: 5px;
  background: #334155;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.4rem;
}
.wizard-progress-fill { height: 100%; background: linear-gradient(90deg, #a855f7, #22c55e); transition: width 0.3s ease; border-radius: 3px; }
.wizard-step-header {
  margin-bottom: 0.5rem;
  text-align: center;
  width: 100%;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
}
.wizard-step-title { font-family: var(--font-handwritten-title); font-size: clamp(1.5rem, 5vmin, 2.1rem); font-weight: 700; color: #e5e7eb; margin: 0; }
.wizard-step-description { font-family: var(--font-handwritten-body); font-size: clamp(1rem, 2.8vmin, 1.25rem); font-weight: 400; color: #9ca3af; margin-top: 0.25rem; line-height: 1.5; }
.wizard-settings-category {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #64748b;
  margin: 1.15rem 0 0.35rem;
  width: 100%;
  text-align: center;
}
.wizard-settings-category:first-child {
  margin-top: 0;
}
.wizard-settings-category-major {
  margin-top: 1.5rem;
}
.wizard-step-timing .wizard-settings-category:first-of-type {
  margin-top: 0;
}
.wizard-settings-category-hint {
  font-size: 0.78rem;
  color: #94a3b8;
  line-height: 1.4;
  margin: 0 0 0.5rem;
  text-align: center;
  max-width: 320px;
}
.wizard-step-options .wizard-settings-category {
  margin-top: 1.25rem;
}
.wizard-step-options .wizard-settings-category:first-of-type {
  margin-top: 0;
}
.wizard-phase-checkin-actions-inline {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  width: 100%;
}
.wizard-step-meta {
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.45;
  margin: 0 0 0.5rem;
  max-width: 320px;
  text-align: center;
}
.wizard-collapsible {
  width: 100%;
  max-width: 320px;
  margin-top: 0.65rem;
  text-align: left;
  box-sizing: border-box;
}
.wizard-collapsible-phase-checkin {
  margin-left: auto;
  margin-right: auto;
  margin-top: 1rem;
}
.wizard-collapsible-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  justify-content: flex-start;
  padding: 0.45rem 0.55rem;
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #93c5fd;
  background: rgba(30, 58, 138, 0.22);
  border: 1px solid #334155;
  border-radius: 0.5rem;
  cursor: pointer;
  box-sizing: border-box;
  font-family: inherit;
}
.wizard-collapsible-toggle:hover {
  background: rgba(30, 58, 138, 0.35);
  color: #bfdbfe;
}
.wizard-collapsible-chevron {
  font-size: 0.65rem;
  opacity: 0.9;
  width: 1rem;
  flex-shrink: 0;
  display: inline-flex;
  justify-content: center;
}
.wizard-collapsible-panel {
  margin-top: 0.5rem;
  padding: 0.5rem 0.65rem 0.65rem;
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.45;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid #334155;
  border-radius: 0.5rem;
  box-sizing: border-box;
}
.wizard-collapsible-panel-phase3 {
  max-width: min(400px, 100%);
}
.wizard-step-phase3 .wizard-step-header {
  max-width: min(400px, 100%);
}
.wizard-step-phase3 {
  justify-content: flex-start;
}
.wizard-step-phase3 .wizard-step-content {
  max-width: min(400px, 100%);
}
.wizard-step-phase3 .wizard-step-content > label {
  margin-top: 0.85rem;
}
.wizard-step-phase3 .wizard-step-content > label.mt {
  margin-top: 1rem;
}
.wizard-options-card:has(.wizard-phase-checkin-actions-inline) {
  padding: 0.85rem 0.75rem;
}
.wizard-collapsible-panel-gap {
  margin-top: 0.5rem !important;
}
.wizard-collapsible-list {
  margin: 0.35rem 0 0;
  padding-left: 1.1rem;
}
.wizard-collapsible-list-tight {
  margin-top: 0.35rem;
}
.wizard-collapsible-list li {
  margin-bottom: 0.4rem;
}
.wizard-collapsible-list li:last-child {
  margin-bottom: 0;
}
.wizard-collapsible-list strong {
  color: #cbd5e1;
}
.wizard-step-options .wizard-collapsible {
  max-width: 100%;
}
.wizard-collapsible-panel p {
  margin: 0;
}
.wizard-option-row .wizard-collapsible {
  margin-top: 0.5rem;
}
.wizard-phase3-mode-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  align-items: stretch;
}
.wizard-phase3-mode-col .wizard-opt-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 100%;
  min-height: auto;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
.wizard-phase3-mode-col .wizard-opt-stack .wizard-opt-sub {
  text-align: center;
  max-width: 100%;
  font-size: 0.8rem;
  line-height: 1.4;
}
.wizard-step-content {
  padding: 0.25rem 0 0.5rem;
  width: 100%;
  max-width: 320px;
  min-width: 0;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.wizard-step-content label {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  width: 100%;
  text-align: center;
}
.wizard-step-content label.mt { margin-top: 1rem; }
.wizard-input {
  width: 100%;
  max-width: 280px;
  padding: 0.55rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #475569;
  background: rgba(2,6,23,0.8);
  color: #e5e7eb;
  min-height: 44px;
  box-sizing: border-box;
  margin: 0 auto;
}
.mt { margin-top: 1rem; }
/* Compact partner steps so name, color, anatomy fit without scrolling */
.wizard-step-partner .wizard-step-header { margin-bottom: 0.5rem; }
.wizard-step-partner .wizard-step-title { font-size: 1.1rem; }
.wizard-step-partner .wizard-step-description { font-size: 0.85rem; margin-top: 0.2rem; }
.wizard-step-partner .wizard-step-content { padding: 0.25rem 0; }
.wizard-step-partner .wizard-step-content label { font-size: 0.85rem; margin-bottom: 0.35rem; }
.wizard-step-partner .wizard-step-content label.mt { margin-top: 0.5rem; }
.wizard-step-partner .wizard-input { padding: 0.4rem 0.6rem; min-height: 36px; }
.wizard-step-partner .color-dots { gap: 0.35rem; padding: 0.15rem 0; }
.wizard-step-partner .color-dot {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
}
.wizard-step-partner .wizard-step-content .row { gap: 0.35rem; }

/* Phase distribution step: compact – title, description, buttons right below; card centered and close to title */
.wizard-step-phase-distribution .wizard-step-header { margin-bottom: 0.15rem; }
.wizard-step-phase-distribution .wizard-step-title { font-size: clamp(1.4rem, 4.5vmin, 1.9rem); }
.wizard-step-phase-distribution .wizard-step-description { font-size: clamp(1rem, 2.8vmin, 1.2rem); margin-top: 0.15rem; }
.wizard-step-phase-distribution .wizard-step-content { padding: 0.1rem 0 0.5rem; align-items: center; }
.wizard-step-phase-distribution .wizard-step-content .row { gap: 0.35rem; }
.wizard-step-phase-distribution .wizard-opt { display: flex; flex-direction: column; align-items: center; justify-content: center; }
.wizard-step-phase-distribution .wizard-opt-label { font-weight: 600; }
.wizard-step-phase-distribution .wizard-opt-sub { font-size: 0.8rem; color: #9ca3af; margin-top: 0.2rem; }
.wizard-step-phase-distribution .custom-sliders-compact { margin-top: 0.5rem; margin-bottom: 0.85rem; gap: 0.25rem; max-width: 280px; }
.wizard-step-phase-distribution .custom-sliders-compact .row { margin-bottom: 0.25rem; gap: 0.35rem; }
.wizard-step-phase-distribution .custom-sliders-compact label { font-size: 0.8rem; margin: 0; }

.wizard-step-options {
  gap: 1rem;
  align-items: stretch;
  text-align: left;
}
/* Wider column so two-column comfort filters are not squeezed into 320px */
.wizard-step-prompts .wizard-step-header {
  max-width: min(560px, 100%);
}
.wizard-step-prompts .wizard-step-content.wizard-step-options {
  max-width: min(560px, 100%);
}
.wizard-option-row-body {
  width: 100%;
  align-self: stretch;
}
.wizard-options-card-voice {
  padding: 0.5rem 0.65rem;
}
.wizard-options-card-voice .wizard-select-voice {
  min-height: 44px;
  box-sizing: border-box;
}
.wizard-option-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.wizard-option-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e5e7eb;
}
.wizard-select-voice {
  width: 100%;
  max-width: 100%;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: rgba(15, 23, 42, 0.9);
  color: #e5e7eb;
  border: 1px solid #334155;
  font-size: 0.9rem;
}
.wizard-voice-hint {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 0.35rem 0 0;
}
.wizard-body-exclude-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 100%;
  max-width: 560px;
}
@media (max-width: 520px) {
  .wizard-body-exclude-grid { grid-template-columns: 1fr; }
}
.wizard-body-exclude-heading {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 0.35rem;
}
.wizard-body-exclude-card {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: center;
}
.wizard-exclude-btn {
  min-width: auto;
  padding: 0.4rem 0.55rem;
  font-size: 0.75rem;
}

.color-dots {
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0.25rem 0;
}
.color-dot {
  width: 34px;
  height: 34px;
  min-width: 34px;
  min-height: 34px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.15s, box-shadow 0.15s;
}
.color-dot:hover { transform: scale(1.08); }
.color-dot.selected { border-color: #fff; box-shadow: 0 0 0 2px #475569, 0 0 12px rgba(168,85,247,0.4); }
.wizard-step-content .row {
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.wrap { flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
.wizard-opt {
  min-width: 100px;
  padding: 0.55rem 0.85rem;
  text-align: center;
  min-height: 44px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 0.5rem;
  box-sizing: border-box;
}
.wizard-opt .sub,
.wizard-opt .wizard-opt-sub { font-size: 0.8rem; font-weight: 500; color: #9ca3af; display: block; margin-top: 0.2rem; }
.custom-sliders { gap: 0.5rem; width: 100%; max-width: 280px; }
.custom-sliders .row { gap: 0.5rem; margin-bottom: 0.5rem; justify-content: center; }
.custom-sliders input[type="range"] { flex: 1; min-width: 80px; accent-color: #a855f7; }
.pct { min-width: 3rem; text-align: right; font-weight: 700; }
.align-center { align-items: center; gap: 0.5rem; }
.wizard-navigation-inner {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}
.wizard-nav-btn {
  padding: 0.55rem 0.85rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  flex: 1;
  box-sizing: border-box;
}
.wizard-nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Phase check-in – centered layout and large Yes/No buttons */
.wizard-step-phase-checkin {
  flex: 1;
  width: 100%;
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem 0;
  box-sizing: border-box;
}
.wizard-phase-checkin-inner {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.wizard-phase-checkin-inner .wizard-step-header {
  margin-bottom: 1rem;
}
.wizard-phase-checkin-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  margin-top: 0.5rem;
}
.wizard-phase-checkin-btn {
  flex: 1;
  min-width: 100px;
  min-height: 44px;
  padding: 0.55rem 0.85rem;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 0.5rem;
  cursor: pointer;
  box-sizing: border-box;
  transition: transform 0.15s, box-shadow 0.15s;
}
.wizard-phase-checkin-btn:hover { transform: scale(1.02); }

/* Presets: 3 columns for a comfortable layout; no horizontal overflow */
.clothing-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  justify-items: stretch;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.clothing-preset-btn {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre-line;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.55rem 0.85rem;
  min-height: 44px;
  font-size: 0.9rem;
  font-weight: 600;
  background-color: #020617;
  color: #e5e7eb;
  border: 1px solid #4b5563;
  border-radius: 0.5rem;
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.2s ease;
  touch-action: manipulation;
}
.clothing-preset-btn:hover {
  background-color: rgba(2, 6, 23, 0.9);
  border-color: #64748b;
}
.clothing-preset-btn.preset-selected {
  background-color: rgba(59, 130, 246, 0.25);
  border-color: #3b82f6;
  color: #93c5fd;
  font-weight: 600;
}
.clothing-preset-btn.preset-selected:hover {
  background-color: rgba(59, 130, 246, 0.35);
  border-color: #60a5fa;
}
.clothing-preset-icon { font-size: 1em; flex-shrink: 0; }
.clothing-list-by-body {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  text-align: left;
  overflow-x: hidden;
}
.clothing-list-intro { font-size: 0.8rem; color: #9ca3af; margin-bottom: 0.75rem; }
.clothing-region { margin-bottom: 0.75rem; min-width: 0; }
.clothing-region-label {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 0.35rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.clothing-region-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  min-width: 0;
}
.clothing-item { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.9rem; color: #e5e7eb; }
/* Clothing item toggles: comfortable tap targets, clear selected state; no horizontal overflow */
.clothing-item-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.65rem;
  min-height: 42px;
  min-width: 0;
  max-width: 100%;
  font-size: 0.85rem;
  font-weight: 500;
  background-color: #020617;
  color: #e5e7eb;
  border: 1px solid #4b5563;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.clothing-item-btn:hover {
  background-color: rgba(2, 6, 23, 0.9);
  border-color: #64748b;
}
.clothing-item-btn.preset-selected {
  background-color: rgba(59, 130, 246, 0.3);
  border-color: #3b82f6;
  color: #93c5fd;
  font-weight: 600;
}
.clothing-item-btn.preset-selected:hover {
  background-color: rgba(59, 130, 246, 0.4);
  border-color: #60a5fa;
}
.clothing-item-icon { font-size: 1.1em; flex-shrink: 0; }
</style>
