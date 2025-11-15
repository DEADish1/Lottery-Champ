// LuckyDraw - Lottery Number Helper
// Main application logic

(function() {
  'use strict';

  // Game presets configuration
  const PRESETS = {
    powerball: {
      name: 'Powerball (US)',
      mainCount: 5,
      mainMax: 69,
      bonusCount: 1,
      bonusMax: 26
    },
    megamillions: {
      name: 'Mega Millions (US)',
      mainCount: 5,
      mainMax: 70,
      bonusCount: 1,
      bonusMax: 25
    },
    euromillions: {
      name: 'EuroMillions (EU/UK)',
      mainCount: 5,
      mainMax: 50,
      bonusCount: 2,
      bonusMax: 12
    },
    classic649: {
      name: 'Classic 6/49',
      mainCount: 6,
      mainMax: 49,
      bonusCount: 0,
      bonusMax: 0
    },
    custom: {
      name: 'Custom',
      mainCount: 5,
      mainMax: 49,
      bonusCount: 0,
      bonusMax: 0
    }
  };

  // DOM Elements
  const elements = {
    gameSelect: document.getElementById('game-select'),
    customSettings: document.getElementById('custom-settings'),
    mainCount: document.getElementById('main-count'),
    mainMax: document.getElementById('main-max'),
    bonusCount: document.getElementById('bonus-count'),
    bonusMax: document.getElementById('bonus-max'),
    luckyWord: document.getElementById('lucky-word'),
    lockMain: document.getElementById('lock-main'),
    lockBonus: document.getElementById('lock-bonus'),
    generateBtn: document.getElementById('generate-btn'),
    outputSection: document.getElementById('output-section'),
    mainNumbers: document.getElementById('main-numbers'),
    bonusGroup: document.getElementById('bonus-group'),
    bonusNumbers: document.getElementById('bonus-numbers'),
    history: document.getElementById('history'),
    clearHistoryBtn: document.getElementById('clear-history-btn')
  };

  // State
  let history = [];
  const MAX_HISTORY = 10;
  const STORAGE_KEY = 'luckydraw_history';

  // Initialize app
  function init() {
    loadHistory();
    renderHistory();
    setupEventListeners();
  }

  // Event listeners
  function setupEventListeners() {
    elements.gameSelect.addEventListener('change', handleGameChange);
    elements.generateBtn.addEventListener('click', generateNumbers);
    elements.clearHistoryBtn.addEventListener('click', clearHistory);
  }

  // Handle game type change
  function handleGameChange() {
    const gameType = elements.gameSelect.value;
    if (gameType === 'custom') {
      elements.customSettings.classList.remove('hidden');
    } else {
      elements.customSettings.classList.add('hidden');
    }
  }

  // Get current game settings
  function getGameSettings() {
    const gameType = elements.gameSelect.value;

    if (gameType === 'custom') {
      return {
        name: 'Custom',
        mainCount: parseInt(elements.mainCount.value) || 5,
        mainMax: parseInt(elements.mainMax.value) || 49,
        bonusCount: parseInt(elements.bonusCount.value) || 0,
        bonusMax: parseInt(elements.bonusMax.value) || 0
      };
    }

    return { ...PRESETS[gameType] };
  }

  // Validate game settings
  function validateSettings(settings) {
    const errors = [];

    if (settings.mainCount < 1 || settings.mainCount > 10) {
      errors.push('Main count must be between 1 and 10');
    }
    if (settings.mainMax < 2 || settings.mainMax > 99) {
      errors.push('Main max must be between 2 and 99');
    }
    if (settings.mainCount > settings.mainMax) {
      errors.push('Main count cannot exceed main max');
    }
    if (settings.bonusCount > 0) {
      if (settings.bonusMax < 2 || settings.bonusMax > 99) {
        errors.push('Bonus max must be between 2 and 99 when bonus count > 0');
      }
      if (settings.bonusCount > settings.bonusMax) {
        errors.push('Bonus count cannot exceed bonus max');
      }
    }
    if (settings.bonusCount < 0 || settings.bonusCount > 5) {
      errors.push('Bonus count must be between 0 and 5');
    }

    return errors;
  }

  // Parse locked numbers from input
  function parseLockedNumbers(input, max) {
    if (!input.trim()) return [];

    const numbers = input.split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 1 && n <= max);

    // Remove duplicates
    return [...new Set(numbers)];
  }

  // String to seed function for deterministic RNG
  function stringToSeed(str) {
    if (!str) return null;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0; // unsigned
    }
    return hash || 1; // avoid 0
  }

  // Seeded random number generator (Linear Congruential Generator)
  function createRNG(seed) {
    if (seed === null) {
      // Use Math.random
      return () => Math.random();
    }

    let state = seed;
    return function() {
      // LCG parameters (same as glibc)
      state = (state * 1103515245 + 12345) >>> 0;
      return (state / 0x100000000);
    };
  }

  // Generate unique random numbers
  function generateUniqueNumbers(count, max, locked, rng) {
    const result = [...locked];
    const available = [];

    // Build available numbers (excluding locked)
    for (let i = 1; i <= max; i++) {
      if (!locked.includes(i)) {
        available.push(i);
      }
    }

    // Check if we can generate enough numbers
    const needed = count - locked.length;
    if (needed < 0) {
      throw new Error(`Too many locked numbers. Maximum allowed: ${count}`);
    }
    if (needed > available.length) {
      throw new Error('Not enough available numbers to generate');
    }

    // Fisher-Yates shuffle on available, then pick first 'needed'
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    // Add needed numbers from shuffled available
    for (let i = 0; i < needed; i++) {
      result.push(available[i]);
    }

    // Sort result
    return result.sort((a, b) => a - b);
  }

  // Main generate function
  function generateNumbers() {
    const settings = getGameSettings();
    const errors = validateSettings(settings);

    if (errors.length > 0) {
      alert('Validation errors:\n' + errors.join('\n'));
      return;
    }

    // Parse locked numbers
    const lockedMain = parseLockedNumbers(elements.lockMain.value, settings.mainMax);
    const lockedBonus = settings.bonusCount > 0
      ? parseLockedNumbers(elements.lockBonus.value, settings.bonusMax)
      : [];

    // Validate locked numbers count
    if (lockedMain.length > settings.mainCount) {
      alert(`Too many locked main numbers. Maximum: ${settings.mainCount}`);
      return;
    }
    if (lockedBonus.length > settings.bonusCount) {
      alert(`Too many locked bonus numbers. Maximum: ${settings.bonusCount}`);
      return;
    }

    // Create RNG
    const luckyWord = elements.luckyWord.value.trim();
    const seed = stringToSeed(luckyWord);
    const rng = createRNG(seed);

    // Generate numbers
    let mainNumbers, bonusNumbers;
    try {
      mainNumbers = generateUniqueNumbers(settings.mainCount, settings.mainMax, lockedMain, rng);
      bonusNumbers = settings.bonusCount > 0
        ? generateUniqueNumbers(settings.bonusCount, settings.bonusMax, lockedBonus, rng)
        : [];
    } catch (error) {
      alert(error.message);
      return;
    }

    // Display results
    displayResults(mainNumbers, bonusNumbers);

    // Add to history
    addToHistory({
      timestamp: Date.now(),
      game: settings.name,
      mainNumbers,
      bonusNumbers,
      luckyWord: luckyWord || null
    });
  }

  // Display generated numbers
  function displayResults(mainNumbers, bonusNumbers) {
    // Show output section
    elements.outputSection.classList.remove('hidden');

    // Clear previous numbers
    elements.mainNumbers.innerHTML = '';
    elements.bonusNumbers.innerHTML = '';

    // Add main number balls with animation delay
    mainNumbers.forEach((num, index) => {
      const ball = document.createElement('div');
      ball.className = 'ball';
      ball.textContent = num;
      ball.style.animationDelay = `${index * 0.1}s`;
      elements.mainNumbers.appendChild(ball);
    });

    // Handle bonus numbers
    if (bonusNumbers.length > 0) {
      elements.bonusGroup.classList.remove('hidden');
      bonusNumbers.forEach((num, index) => {
        const ball = document.createElement('div');
        ball.className = 'ball bonus';
        ball.textContent = num;
        ball.style.animationDelay = `${(mainNumbers.length + index) * 0.1}s`;
        elements.bonusNumbers.appendChild(ball);
      });
    } else {
      elements.bonusGroup.classList.add('hidden');
    }
  }

  // History management
  function loadHistory() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        history = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      history = [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  function addToHistory(entry) {
    history.unshift(entry);
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    saveHistory();
    renderHistory();
  }

  function clearHistory() {
    if (confirm('Clear all history?')) {
      history = [];
      saveHistory();
      renderHistory();
    }
  }

  function renderHistory() {
    if (history.length === 0) {
      elements.history.innerHTML = '<p class="empty-history">No history yet. Generate some numbers!</p>';
      return;
    }

    elements.history.innerHTML = history.map(entry => {
      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

      let numbersHtml = entry.mainNumbers.map(n =>
        `<span class="history-ball">${n}</span>`
      ).join('');

      if (entry.bonusNumbers && entry.bonusNumbers.length > 0) {
        numbersHtml += '<span class="history-separator">|</span>';
        numbersHtml += entry.bonusNumbers.map(n =>
          `<span class="history-ball bonus">${n}</span>`
        ).join('');
      }

      const wordInfo = entry.luckyWord ? `Seed: "${entry.luckyWord}"` : 'Random';

      return `
        <div class="history-item">
          <div class="history-meta">
            <span>${entry.game}</span>
            <span>${dateStr} ${timeStr}</span>
          </div>
          <div class="history-numbers">${numbersHtml}</div>
          <div class="history-meta" style="margin-top: 4px; margin-bottom: 0;">
            <span style="font-style: italic;">${wordInfo}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
