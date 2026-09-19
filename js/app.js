/**
 * レポポ・読！ - 教科書・長文読解レポート作成ナビゲーション
 * Apple Award-Winning Interactive Experience
 */

(function() {
  'use strict';

  // --- STORAGE KEYS ---
  const STORAGE_KEY = 'repopodoku_data_v2';

  // --- APP STATE ---
  const state = {
    currentStep: 1,
    // 手順1・手順2で共有するスロット
    slots: {
      theme: '',
      learned1: '',
      learned2: '',
      learned3: '',
      point: ''
    },
    reportText: ''
  };

  // 高校生向けサンプル見本データ（現代文教科書・長文読解の例）
  const SAMPLE_DATA = {
    theme: '夏目漱石『こころ』に見る近代人の孤独とエゴイズム',
    learned1: '先生が遺書を通じて打ち明けた過去の罪悪感とエゴイズム',
    learned2: '親友Kへの裏切りが生涯消えない心のトゲになったこと',
    learned3: '明治という時代の終わりと個人の生き方の重なり合い',
    point: '誰もが抱える人間の弱さと向き合う誠実さの大切さ'
  };

  // --- DOM ELEMENTS ---
  const dom = {
    // ステップ進行タブ & プログレス
    stepTabs: document.querySelectorAll('.step-tab'),
    stepProgressLine: document.getElementById('stepProgressLine'),
    stepPages: {
      1: document.getElementById('pageStep1'),
      2: document.getElementById('pageStep2'),
      3: document.getElementById('pageStep3'),
      4: document.getElementById('pageStep4')
    },
    // 見本投入ボタン
    btnLoadSample: document.getElementById('btnLoadSample'),

    // 手順1 要素（各項目直下の2行入力欄）
    step1Inputs: {
      theme: document.getElementById('step1Theme'),
      learned1: document.getElementById('step1Learned1'),
      learned2: document.getElementById('step1Learned2'),
      learned3: document.getElementById('step1Learned3'),
      point: document.getElementById('step1Point')
    },
    btnClearStep1: document.getElementById('btnClearStep1'),

    // 手順2 要素（穴埋めスロット・プレビュー）
    slotInputs: {
      theme: document.getElementById('slotTheme'),
      learned1: document.getElementById('slotLearned1'),
      learned2: document.getElementById('slotLearned2'),
      learned3: document.getElementById('slotLearned3'),
      point: document.getElementById('slotPoint')
    },
    templatePreviewText: document.getElementById('templatePreviewText'),
    btnClearStep2: document.getElementById('btnClearStep2'),

    // 手順3 要素
    reportTextarea: document.getElementById('reportTextarea'),
    charCount: document.getElementById('charCount'),
    charStatusBadge: document.getElementById('charStatusBadge'),
    charProgressFill: document.getElementById('charProgressFill'),
    btnFit200: document.getElementById('btnFit200'),
    btnRegenerate: document.getElementById('btnRegenerate'),
    btnClearStep3: document.getElementById('btnClearStep3'),
    btnCopyStep3: document.getElementById('btnCopyStep3'),

    // 手順4 要素
    exportPreviewBox: document.getElementById('exportPreviewBox'),
    exportCharCount: document.getElementById('exportCharCount'),
    btnCopyFromHeader: document.getElementById('btnCopyFromHeader'),
    btnOpenChatGPT: document.getElementById('btnOpenChatGPT'),
    btnShareMemo: document.getElementById('btnShareMemo'),

    // フローティングボトムドック
    dockContent: document.getElementById('dockContent'),

    // トーストコンテナ
    toastContainer: document.getElementById('toastContainer')
  };

  // --- INITIALIZATION ---
  function init() {
    loadFromLocalStorage();
    setupEventListeners();
    updateInputsFromState();
    updateStep2Preview();
    updateStep3Counter();
    renderBottomDock();
    updateStepUI();
  }

  // --- LOCAL STORAGE ---
  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        slots: state.slots,
        reportText: state.reportText
      }));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }

  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.slots) state.slots = { ...state.slots, ...parsed.slots };
        if (typeof parsed.reportText === 'string') state.reportText = parsed.reportText;
      }
    } catch (e) {
      console.warn('LocalStorage load failed', e);
    }
  }

  // --- HAPTIC FEEDBACK ---
  function triggerHaptic(type = 'light') {
    if ('vibrate' in navigator) {
      try {
        if (type === 'medium') navigator.vibrate(25);
        else if (type === 'success') navigator.vibrate([15, 40, 15]);
        else navigator.vibrate(12);
      } catch (e) {}
    }
  }

  // --- TOAST NOTIFICATION ---
  function showToast(message, icon = '✨') {
    triggerHaptic('medium');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 2400);
  }

  // --- STEP NAVIGATION ---
  function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > 4) return;
    triggerHaptic('light');
    state.currentStep = stepNumber;

    // 手順遷移時の処理
    if (stepNumber === 2) {
      updateInputsFromState();
      updateStep2Preview();
    } else if (stepNumber === 3) {
      if (!state.reportText.trim()) {
        state.reportText = buildTextFromSlots();
        dom.reportTextarea.value = state.reportText;
      } else {
        dom.reportTextarea.value = state.reportText;
      }
      updateStep3Counter();
    } else if (stepNumber === 4) {
      const text = state.reportText.trim() || buildTextFromSlots();
      dom.exportPreviewBox.textContent = text || '（まだ文章が入力されていません。手順3で作成してください）';
      dom.exportCharCount.textContent = `${text.length}字`;
    }

    updateStepUI();
    renderBottomDock();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateStepUI() {
    // タブの表示更新
    dom.stepTabs.forEach(tab => {
      const step = parseInt(tab.getAttribute('data-step'), 10);
      tab.classList.remove('active', 'completed');
      if (step === state.currentStep) {
        tab.classList.add('active');
      } else if (step < state.currentStep) {
        tab.classList.add('completed');
      }
    });

    // プログレスバーの進捗計算 (0%, 33.3%, 66.6%, 100%)
    const progressPercents = [0, 0, 33.3, 66.6, 100];
    dom.stepProgressLine.style.width = `${progressPercents[state.currentStep]}%`;

    // ページの表示切り替え
    Object.keys(dom.stepPages).forEach(s => {
      const page = dom.stepPages[s];
      if (parseInt(s, 10) === state.currentStep) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });
  }

  // --- SYNC INPUTS AND PREVIEW ---
  function updateInputsFromState() {
    const keys = ['theme', 'learned1', 'learned2', 'learned3', 'point'];
    keys.forEach(k => {
      const val = state.slots[k] || '';
      if (dom.step1Inputs[k]) dom.step1Inputs[k].value = val;
      if (dom.slotInputs[k]) dom.slotInputs[k].value = val;
    });
  }

  function buildTextFromSlots() {
    const t = (state.slots.theme || '【①テーマ】').trim();
    const l1 = (state.slots.learned1 || '【②理解したこと】').trim();
    const l2 = (state.slots.learned2 || '【②理解したこと】').trim();
    const l3 = (state.slots.learned3 || '【②理解したこと】').trim();
    const p = (state.slots.point || '【③このテーマで言いたかったこと】').trim();

    return `今回の授業動画では、${t}について学びました。教科書を読んでみて、${l1}ことがよく分かりました。そして特に印象に残ったのは、${l2}です。また、${l3}について興味を持ち、もっと調べてみようと思いました。${t}で言いたかったことは、${p}ではないかと私は思いました。今後も勉強していきたいと思います。`;
  }

  function updateStep2Preview() {
    if (!dom.templatePreviewText) return;

    const t = state.slots.theme ? `<span class="template-slot">${escapeHtml(state.slots.theme)}</span>` : '<span class="template-slot">【①テーマ】</span>';
    const l1 = state.slots.learned1 ? `<span class="template-slot">${escapeHtml(state.slots.learned1)}</span>` : '<span class="template-slot">【②理解したこと】</span>';
    const l2 = state.slots.learned2 ? `<span class="template-slot">${escapeHtml(state.slots.learned2)}</span>` : '<span class="template-slot">【②理解したこと】</span>';
    const l3 = state.slots.learned3 ? `<span class="template-slot">${escapeHtml(state.slots.learned3)}</span>` : '<span class="template-slot">【②理解したこと】</span>';
    const p = state.slots.point ? `<span class="template-slot">${escapeHtml(state.slots.point)}</span>` : '<span class="template-slot">【③このテーマで言いたかったこと】</span>';

    dom.templatePreviewText.innerHTML = `今回の授業動画では、${t}について学びました。教科書を読んでみて、${l1}ことがよく分かりました。そして特に印象に残ったのは、${l2}です。また、${l3}について興味を持ち、もっと調べてみようと思いました。${t}で言いたかったことは、${p}ではないかと私は思いました。今後も勉強していきたいと思います。`;
  }

  // --- STEP 3: 200字エディタ & カウンター ---
  function updateStep3Counter() {
    const text = dom.reportTextarea.value;
    state.reportText = text;
    saveToLocalStorage();

    const len = text.length;
    dom.charCount.textContent = len;

    // プログレスバー（最大200字で100%、超過時は赤）
    const pct = Math.min(Math.round((len / 200) * 100), 100);
    dom.charProgressFill.style.width = `${pct}%`;

    if (len === 0) {
      dom.charStatusBadge.textContent = '文字を入力してね ✏️';
      dom.charStatusBadge.className = 'counter-status-badge';
      dom.charProgressFill.classList.remove('over');
      dom.charCount.style.color = 'var(--mint-green-dark)';
    } else if (len > 200) {
      dom.charStatusBadge.textContent = `${len - 200}字オーバー ⚠️`;
      dom.charStatusBadge.className = 'counter-status-badge warning';
      dom.charProgressFill.classList.add('over');
      dom.charCount.style.color = '#EF4444';
    } else if (len >= 160 && len <= 200) {
      dom.charStatusBadge.textContent = 'ちょうど良い分量！🎉';
      dom.charStatusBadge.className = 'counter-status-badge';
      dom.charProgressFill.classList.remove('over');
      dom.charCount.style.color = 'var(--mint-green-dark)';
    } else {
      dom.charStatusBadge.textContent = `あと${200 - len}字書けます 🌿`;
      dom.charStatusBadge.className = 'counter-status-badge';
      dom.charProgressFill.classList.remove('over');
      dom.charCount.style.color = 'var(--mint-green-dark)';
    }
  }

  function fitTextTo200() {
    let text = dom.reportTextarea.value.trim();
    if (text.length <= 200) {
      showToast('すでに200字以内です！', '✅');
      return;
    }

    // 200文字以内に収まるよう句点で調整、または末尾を自然にカット
    let trimmed = text.substring(0, 199);
    const lastPeriod = trimmed.lastIndexOf('。');
    if (lastPeriod > 140) {
      trimmed = trimmed.substring(0, lastPeriod + 1);
    } else {
      trimmed = trimmed + '。';
    }

    dom.reportTextarea.value = trimmed;
    updateStep3Counter();
    triggerHaptic('success');
    showToast('200字以内に調整しました！', '✂️');
  }

  // --- STEP 4: ChatGPT連携・共有・コピー ---
  function openChatGPTWithPrompt() {
    const text = (state.reportText || buildTextFromSlots()).trim();
    if (!text) {
      showToast('レポート文章が空です', '⚠️');
      return;
    }

    const promptText = `以下の高校生レポート（教科書・長文読解）を、文意や趣旨を維持したまま、高校の提出レポートとしてより自然で説得力のある文章になるよう添削・アドバイスをお願いします。\n\n【作成したレポート】\n${text}\n\n【アドバイスしてほしい点】\n1. 200字前後でのより自然な表現の提案\n2. 良かった点とさらに深めるためのポイント`;

    copyToClipboard(promptText, '添削用プロンプトをコピーしてChatGPTを開きます！');
    setTimeout(() => {
      window.open('https://chatgpt.com/', '_blank');
    }, 450);
  }

  function shareToMemoApp() {
    const text = (state.reportText || buildTextFromSlots()).trim();
    if (!text) {
      showToast('レポート文章が空です', '⚠️');
      return;
    }

    if (navigator.share) {
      navigator.share({
        title: '教科書レポート - レポポ・読！',
        text: text
      }).then(() => {
        showToast('共有しました！', '📱');
      }).catch(err => {
        if (err.name !== 'AbortError') {
          copyToClipboard(text, 'レポート文章をコピーしました！');
        }
      });
    } else {
      copyToClipboard(text, 'メモ帳に貼り付けられるようコピーしました！');
    }
  }

  // --- CLIPBOARD HELPER ---
  function copyToClipboard(text, successMsg = 'クリップボードにコピーしました！') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg, '📋');
      }).catch(() => {
        fallbackCopy(text, successMsg);
      });
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMsg, '📋');
    } catch (e) {
      showToast('コピーに失敗しました', '❌');
    }
    document.body.removeChild(ta);
  }

  // --- FLOATING BOTTOM ACTION DOCK (丸型ボタン: 60px以上) ---
  function renderBottomDock() {
    const step = state.currentStep;
    let buttonsHtml = '';

    if (step === 1) {
      buttonsHtml = `
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-neutral" id="dockBtnClear1" title="入力を全クリア" aria-label="全クリア">
            <span class="btn-circle-icon">🗑️</span>
          </button>
          <span class="btn-circle-label">全クリア</span>
        </div>
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-purple" id="dockBtnSample1" title="高校生向けの見本を入れる" aria-label="見本">
            <span class="btn-circle-icon">🪄</span>
          </button>
          <span class="btn-circle-label">見本例</span>
        </div>
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-coral btn-circle-large" id="dockBtnNext1" title="手順2へ進む" aria-label="手順2へ進む">
            <span class="btn-circle-icon">➔</span>
          </button>
          <span class="btn-circle-label">穴埋めへ</span>
        </div>
      `;
    } else if (step === 2) {
      buttonsHtml = `
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-neutral" id="dockBtnPrev2" title="手順1へ戻る" aria-label="手順1へ戻る">
            <span class="btn-circle-icon">⬅️</span>
          </button>
          <span class="btn-circle-label">戻る</span>
        </div>
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-neutral" id="dockBtnClear2" title="枠をクリア" aria-label="枠をクリア">
            <span class="btn-circle-icon">🔄</span>
          </button>
          <span class="btn-circle-label">リセット</span>
        </div>
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-yellow btn-circle-large" id="dockBtnNext2" title="手順3へ進む" aria-label="手順3へ進む">
            <span class="btn-circle-icon">➔</span>
          </button>
          <span class="btn-circle-label">200字作成</span>
        </div>
      `;
    } else if (step === 3) {
      buttonsHtml = `
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-neutral" id="dockBtnPrev3" title="手順2へ戻る" aria-label="手順2へ戻る">
            <span class="btn-circle-icon">⬅️</span>
          </button>
          <span class="btn-circle-label">戻る</span>
        </div>
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-neutral" id="dockBtnClear3" title="文章をクリア" aria-label="文章をクリア">
            <span class="btn-circle-icon">🗑️</span>
          </button>
          <span class="btn-circle-label">クリア</span>
        </div>
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-sky" id="dockBtnCopy3" title="文章をコピー" aria-label="文章をコピー">
            <span class="btn-circle-icon">📋</span>
          </button>
          <span class="btn-circle-label">コピー</span>
        </div>
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-green btn-circle-large" id="dockBtnNext3" title="手順4へ進む" aria-label="手順4へ進む">
            <span class="btn-circle-icon">🚀</span>
          </button>
          <span class="btn-circle-label">完成・AI</span>
        </div>
      `;
    } else if (step === 4) {
      buttonsHtml = `
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-neutral" id="dockBtnPrev4" title="手順3へ戻る" aria-label="手順3へ戻る">
            <span class="btn-circle-icon">⬅️</span>
          </button>
          <span class="btn-circle-label">編集に戻る</span>
        </div>
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-sky" id="dockBtnCopy4" title="レポート文章をコピー" aria-label="レポート文章をコピー">
            <span class="btn-circle-icon">📋</span>
          </button>
          <span class="btn-circle-label">コピー</span>
        </div>
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-chatgpt btn-circle-large" id="dockBtnChatGPT4" title="ChatGPTを開いて添削" aria-label="ChatGPTを開いて添削">
            <span class="btn-circle-icon">🤖</span>
          </button>
          <span class="btn-circle-label">ChatGPT</span>
        </div>
        <div class="circle-btn-wrapper">
          <button type="button" class="btn-circle btn-circle-memo" id="dockBtnShare4" title="スマホのメモ帳や共有を開く" aria-label="共有">
            <span class="btn-circle-icon">📱</span>
          </button>
          <span class="btn-circle-label">メモ共有</span>
        </div>
      `;
    }

    dom.dockContent.innerHTML = buttonsHtml;

    // ドック内丸型ボタンのイベントリスナー
    if (step === 1) {
      document.getElementById('dockBtnClear1')?.addEventListener('click', confirmClearStep1);
      document.getElementById('dockBtnSample1')?.addEventListener('click', loadSampleData);
      document.getElementById('dockBtnNext1')?.addEventListener('click', () => goToStep(2));
    } else if (step === 2) {
      document.getElementById('dockBtnPrev2')?.addEventListener('click', () => goToStep(1));
      document.getElementById('dockBtnClear2')?.addEventListener('click', clearSlots);
      document.getElementById('dockBtnNext2')?.addEventListener('click', () => {
        state.reportText = buildTextFromSlots();
        dom.reportTextarea.value = state.reportText;
        goToStep(3);
      });
    } else if (step === 3) {
      document.getElementById('dockBtnPrev3')?.addEventListener('click', () => goToStep(2));
      document.getElementById('dockBtnClear3')?.addEventListener('click', clearStep3Text);
      document.getElementById('dockBtnCopy3')?.addEventListener('click', () => copyToClipboard(dom.reportTextarea.value, '文章をコピーしました！'));
      document.getElementById('dockBtnNext3')?.addEventListener('click', () => goToStep(4));
    } else if (step === 4) {
      document.getElementById('dockBtnPrev4')?.addEventListener('click', () => goToStep(3));
      document.getElementById('dockBtnCopy4')?.addEventListener('click', () => {
        const text = state.reportText.trim() || buildTextFromSlots();
        copyToClipboard(text, 'レポート文章をコピーしました！');
      });
      document.getElementById('dockBtnChatGPT4')?.addEventListener('click', openChatGPTWithPrompt);
      document.getElementById('dockBtnShare4')?.addEventListener('click', shareToMemoApp);
    }
  }

  // --- ACTION HELPERS ---
  function confirmClearStep1() {
    const hasValue = Object.values(state.slots).some(v => (v || '').trim().length > 0);
    if (!hasValue) {
      showToast('入力欄はすでに空です', '💡');
      return;
    }
    if (confirm('手順1の入力をすべてクリアしますか？')) {
      clearSlots();
      showToast('入力を全クリアしました', '🗑️');
    }
  }

  function clearSlots() {
    state.slots = { theme: '', learned1: '', learned2: '', learned3: '', point: '' };
    saveToLocalStorage();
    updateInputsFromState();
    updateStep2Preview();
  }

  function clearStep3Text() {
    if (confirm('入力中の200字文章をクリアしますか？')) {
      dom.reportTextarea.value = '';
      state.reportText = '';
      saveToLocalStorage();
      updateStep3Counter();
      showToast('文章をクリアしました', '🗑️');
    }
  }

  function loadSampleData() {
    state.slots = { ...SAMPLE_DATA };
    state.reportText = buildTextFromSlots();
    dom.reportTextarea.value = state.reportText;

    saveToLocalStorage();
    updateInputsFromState();
    updateStep2Preview();
    updateStep3Counter();

    triggerHaptic('success');
    showToast('高校生向けの見本データを入力しました！🪄', '🎉');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // ステップタブクリック
    dom.stepTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const step = parseInt(tab.getAttribute('data-step'), 10);
        goToStep(step);
      });
    });

    // 見本投入ボタン
    dom.btnLoadSample?.addEventListener('click', loadSampleData);

    // 手順1: 各入力欄のinputイベント
    const keys = ['theme', 'learned1', 'learned2', 'learned3', 'point'];
    keys.forEach(k => {
      const el1 = dom.step1Inputs[k];
      if (el1) {
        el1.addEventListener('input', () => {
          state.slots[k] = el1.value;
          if (dom.slotInputs[k]) dom.slotInputs[k].value = el1.value;
          saveToLocalStorage();
          updateStep2Preview();
        });
      }

      // 手順2の入力欄とも双方向同期
      const el2 = dom.slotInputs[k];
      if (el2) {
        el2.addEventListener('input', () => {
          state.slots[k] = el2.value;
          if (dom.step1Inputs[k]) dom.step1Inputs[k].value = el2.value;
          saveToLocalStorage();
          updateStep2Preview();
        });
      }
    });

    // 手順1 & 手順2のクリアボタン
    dom.btnClearStep1?.addEventListener('click', confirmClearStep1);
    dom.btnClearStep2?.addEventListener('click', () => {
      clearSlots();
      showToast('穴埋め枠をリセットしました', '🔄');
    });

    // 手順3: テキストエリア編集・カウンター
    dom.reportTextarea?.addEventListener('input', updateStep3Counter);

    // 手順3: 200字調整
    dom.btnFit200?.addEventListener('click', fitTextTo200);

    // 手順3: 再生成
    dom.btnRegenerate?.addEventListener('click', () => {
      dom.reportTextarea.value = buildTextFromSlots();
      updateStep3Counter();
      triggerHaptic('success');
      showToast('箇条書きから文章を再生成しました！', '🔄');
    });

    // 手順3: クリア & コピー
    dom.btnClearStep3?.addEventListener('click', clearStep3Text);
    dom.btnCopyStep3?.addEventListener('click', () => copyToClipboard(dom.reportTextarea.value, '文章をコピーしました！'));

    // 手順4: コピーボタン & 連携ボタン
    dom.btnCopyFromHeader?.addEventListener('click', () => {
      const text = state.reportText.trim() || buildTextFromSlots();
      copyToClipboard(text, 'レポート文章をコピーしました！');
    });

    dom.btnOpenChatGPT?.addEventListener('click', openChatGPTWithPrompt);
    dom.btnShareMemo?.addEventListener('click', shareToMemoApp);
  }

  // 起動
  document.addEventListener('DOMContentLoaded', init);
})();
