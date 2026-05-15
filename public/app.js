const form = document.getElementById("ask-form");
const questionInput = document.getElementById("question");
const answerEl = document.getElementById("answer");
const statusEl = document.getElementById("status");

const clearBtn = document.getElementById("clear-btn");
const speakBtn = document.getElementById("speak-btn");
const stopBtn = document.getElementById("stop-btn");
const copyBtn = document.getElementById("copy-btn");
const shareBtn = document.getElementById("share-btn");

let currentAnswer = "";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderAnswer(text) {
  if (!text) {
    return "";
  }

  const lines = escapeHtml(text).split(/\r?\n/);
  const blocks = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length) {
      blocks.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.*)/);
    if (bulletMatch) {
      const itemText = bulletMatch[1].replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      listItems.push(itemText);
      continue;
    }

    flushList();
    const paragraph = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    blocks.push(`<p>${paragraph}</p>`);
  }

  flushList();
  return blocks.join("");
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setAnswer(text) {
  currentAnswer = text;
  if (!text) {
    answerEl.textContent = "Ask a question to see the answer here.";
    return;
  }
  answerEl.innerHTML = renderAnswer(text);
}

function stopSpeech() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

async function askGemini(prompt) {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxOutputTokens: 1200 })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data.answer || "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  stopSpeech();

  const prompt = questionInput.value.trim();
  if (!prompt) {
    setStatus("Type a question to continue.");
    return;
  }

  setStatus("Thinking...");
  setAnswer("Working on it...");
  form.querySelector("button[type='submit']").disabled = true;

  try {
    const answer = await askGemini(prompt);
    setAnswer(answer);
    setStatus("Answer ready");
  } catch (error) {
    setAnswer("");
    setStatus(error.message);
  } finally {
    form.querySelector("button[type='submit']").disabled = false;
  }
});

questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

clearBtn.addEventListener("click", () => {
  stopSpeech();
  questionInput.value = "";
  setAnswer("");
  setStatus("Cleared");
});

speakBtn.addEventListener("click", () => {
  stopSpeech();
  if (!currentAnswer) {
    setStatus("Nothing to speak yet.");
    return;
  }
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(currentAnswer);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    setStatus("Speaking...");
  } else {
    setStatus("Speech synthesis not supported.");
  }
});

stopBtn.addEventListener("click", () => {
  stopSpeech();
  setStatus("Speech stopped");
});

copyBtn.addEventListener("click", async () => {
  if (!currentAnswer) {
    setStatus("Nothing to copy yet.");
    return;
  }
  try {
    await navigator.clipboard.writeText(currentAnswer);
    setStatus("Copied to clipboard");
  } catch {
    setStatus("Copy failed");
  }
});

shareBtn.addEventListener("click", async () => {
  if (!currentAnswer) {
    setStatus("Nothing to share yet.");
    return;
  }
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Ask Gemini",
        text: currentAnswer
      });
      setStatus("Shared");
    } catch {
      setStatus("Share canceled");
    }
  } else {
    try {
      await navigator.clipboard.writeText(currentAnswer);
      setStatus("Sharing not supported. Copied instead.");
    } catch {
      setStatus("Sharing not supported.");
    }
  }
});
