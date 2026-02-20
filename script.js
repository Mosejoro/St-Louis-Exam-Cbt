// API Configuration
const apiKey = "AIzaSyAq-OpHyYcqlK5rtNJ8MBtPP4LcCVotzcU";
const sheetId = "1CSNKDZZdz4ZKL28o2jPUcbGJ8xM85Jifpan_mxaZVKQ";
const sheetURL =
  "https://script.google.com/macros/s/AKfycbx3-EjFsnOgcQBFwSt-xN9C2dNo9HcW_X93uIcZOPYupLlyXbGlc29mYK-QhHw-IfJHOQ/exec";

// Helper Functions
function getSheetName(subject, classLevel) {
  return `${subject.replace(/\s+/g, "")}_${classLevel}`;
}

// Fetch and Display Questions
async function fetchQuestions(day, cls, subject) {
  if (!subject) {
    alert("Please select a subject.");
    return;
  }

  const sheetName = getSheetName(subject, cls);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.values) {
      throw new Error(`No sheet found for ${sheetName}`);
    }

    displayQuestions(data.values, subject, cls);

    startTimer();
  } catch (error) {
    console.error("Error fetching questions:", error);
    document.getElementById("questions").innerHTML = `
      <p class="error">Error: Could not load questions for ${subject.replace(
        /_/g,
        " "
      )} - ${cls}.</p>
      <p>Please make sure the corresponding sheet exists in the spreadsheet.</p>
      <button onclick="window.location.href='index.html'" class="back-btn">Go Back</button>
    `;
  }
}

// Store questions data globally
let questionsData = [];
let isSubmittingExam = false; // Declare the variable here

// Display questions in HTML
// Updated displayQuestions function with image support
// Updated displayQuestions function with Google Drive image support

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function displayQuestions(data, subject, cls) {
  const questionsDiv = document.getElementById("questions");
  questionsDiv.innerHTML = "";
  questionsData = [];

  if (!data || data.length <= 1) {
    questionsDiv.innerHTML = "<p>No questions found.</p>";
    return;
  }

  // Separate header row and question rows
  const headerRow = data[0];
  const questionRows = data.slice(1);

  // Keep first 7 questions fixed, shuffle only the remaining questions
  const fixedQuestions = questionRows.slice(0, 50);
  const questionsToShuffle = questionRows.slice(50);
  const shuffledRemainingQuestions = shuffleArray(questionsToShuffle);

  // Combine fixed questions with shuffled remaining questions
  const finalQuestionRows = [...fixedQuestions, ...shuffledRemainingQuestions];

  // Add exam metadata section
  questionsDiv.innerHTML = `
       <div class="exam-header">
      <h3 class="Warn">Do well to answer all the questions before the time runs out.</h3>
      <div class="student-info">
        <div class="name-inputs">
          <div class="input-group">
            <label for="surname">Surname:</label>
            <input class="Input" type="text" oninput="this.value = this.value.toUpperCase()" id="surname" placeholder="e.g. Success" required>
          </div>
          <div class="input-group">
            <label for="firstname">First Name:</label>
            <input class="Input" type="text" id="firstname" oninput="this.value = this.value.toUpperCase()" placeholder="e.g. Ada" required>
          </div>
        </div>
      </div>
    </div>
  `;

  // Create questions
  for (let i = 0; i < finalQuestionRows.length; i++) {
    const row = finalQuestionRows[i];
    const questionText = row[0];
    const options = {
      A: row[1],
      B: row[2],
      C: row[3],
      D: row[4],
    };
    const correctAnswer = row[5];

    // Shuffle the options while maintaining the correct mapping
    const optionKeys = ["A", "B", "C", "D"];
    const shuffledOptionKeys = shuffleArray([...optionKeys]);

    // Create shuffled options object
    const shuffledOptions = {};
    shuffledOptionKeys.forEach((newKey, index) => {
      shuffledOptions[newKey] = options[optionKeys[index]];
    });

    // Find the new key for the correct answer
    const newCorrectAnswerKey =
      shuffledOptionKeys[optionKeys.indexOf(correctAnswer)];

    questionsData.push({
      questionNumber: i + 1,
      correctAnswer: newCorrectAnswerKey,
      subject,
      cls,
    });

    // Check if the question contains an image URL
    let processedQuestion = questionText;
    let imageHTML = "";

    // Process the question text to extract and handle image URLs
    const { processedText, imageHtmlContent } = processQuestionImages(
      questionText,
      i
    );
    processedQuestion = processedText;
    imageHTML = imageHtmlContent;

    const questionHTML = `
      <div class="question-container">
        <p class="question-text"><strong>Question ${
          i + 1
        }:</strong> ${processedQuestion}</p>
        ${imageHTML}
        <div class="options-container">
          ${Object.entries(shuffledOptions)
            .map(
              ([key, value]) => `
            <label class="option-label">
              <input type="radio" name="q${i + 1}" value="${key}" required> 
              ${value}
            </label>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    questionsDiv.innerHTML += questionHTML;
  }

  // Add submit button
  questionsDiv.innerHTML += `
    <button onclick="checkAnswers()" class="submit-btn">Submit Exam</button>
  `;

  // Add this line to set up the listeners for removing the "unanswered" class
  addRadioChangeListeners();

  addNameValidationListeners();

  // Setup image error handling
  setupImageErrorHandling();
}

// Helper function to shuffle options while preserving the correct answer's mapping
function shuffleOptionsPreservingCorrectAnswer(options, correctAnswer) {
  const optionsArray = Object.entries(options);
  const shuffledArray = shuffleArray([...optionsArray]);
  return Object.fromEntries(shuffledArray);
}

// Helper function to get the new letter corresponding to the correct answer after shuffling
function getShuffledCorrectAnswer(shuffledOptions, originalCorrectAnswer) {
  const originalOptions = ["A", "B", "C", "D"];
  const shuffledKeys = Object.keys(shuffledOptions);
  const originalIndex = originalOptions.indexOf(originalCorrectAnswer);
  return shuffledKeys[originalIndex];
}

// Helper function to process question images - handles both regular and Google Drive images
function processQuestionImages(questionText, questionNumber) {
  let processedText = questionText;
  let imageHtmlContent = "";

  // Regular expression for standard image URLs
  const standardImageRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;

  // Regular expression for Google Drive links
  // This matches patterns like:
  // https://drive.google.com/file/d/FILEID/view
  // https://drive.google.com/open?id=FILEID
  const googleDriveRegex =
    /(https?:\/\/drive\.google\.com\/file\/d\/([^/\s]+)\/view[^\s]*|https?:\/\/drive\.google\.com\/open\?id=([^\s&]+))/gi;

  // First check for Google Drive links
  const driveMatches = [...questionText.matchAll(googleDriveRegex)];

  if (driveMatches && driveMatches.length > 0) {
    for (const match of driveMatches) {
      const fullUrl = match[0];
      // Extract fileId from the URL - either from /d/FILEID/view or ?id=FILEID
      const fileId = match[2] || match[3];

      if (fileId) {
        // Create a direct link for the image
        // This format allows direct image embedding from Google Drive
        const directImageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

        // Replace the Google Drive URL in the question text
        processedText = processedText.replace(fullUrl, "");

        // Create image HTML
        imageHtmlContent += `<div class="question-image-container">
          <img src="${directImageUrl}" alt="Question ${questionNumber} image" class="question-image" data-source="google-drive">
        </div>`;
      }
    }
  }
  // If no Google Drive links, check for standard image URLs
  else {
    const standardMatches = [...questionText.matchAll(standardImageRegex)];

    if (standardMatches && standardMatches.length > 0) {
      for (const match of standardMatches) {
        const imageUrl = match[0];

        // Replace the URL in the question text
        processedText = processedText.replace(imageUrl, "");

        // Create image HTML
        imageHtmlContent += `<div class="question-image-container">
          <img src="${imageUrl}" alt="Question ${questionNumber} image" class="question-image">
        </div>`;
      }
    }
  }

  return { processedText, imageHtmlContent };
}

// Function to handle image loading errors
function setupImageErrorHandling() {
  document.querySelectorAll(".question-image").forEach((img) => {
    img.onerror = function () {
      this.onerror = null;

      // Custom message for Google Drive images
      const errorMessage =
        this.dataset.source === "google-drive"
          ? "Google Drive image could not be loaded. Make sure the file is publicly accessible."
          : "Image could not be loaded";

      this.parentNode.innerHTML = `
        <div class="image-error">
          <p>${errorMessage}</p>
          <small>${this.src}</small>
        </div>
      `;
    };
  });
}

// Function to validate name fields
function validateNameFields() {
  const surname = document.getElementById("surname").value.trim();
  const firstname = document.getElementById("firstname").value.trim();
  return surname !== "" && firstname !== "";
}

// Function to show name warning
function showNameWarning() {
  const toast = document.createElement("div");
  toast.className = "toast toast-warning";
  toast.innerHTML =
    "⚠️ <strong>Please enter your Surname and First Name first!</strong><br>You must fill in your name before answering questions.";
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// Function to validate radio button selections with name check
function addNameValidationListeners() {
  const radioButtons = document.querySelectorAll('input[type="radio"]');

  radioButtons.forEach((radio) => {
    radio.addEventListener("click", (e) => {
      // Check if name fields are filled
      if (!validateNameFields()) {
        e.preventDefault();
        e.stopPropagation();
        radio.checked = false;
        showNameWarning();
        return false;
      }
    });
  });
}

// Check answers and calculate score
// Function to check answers with validation for unanswered questions
// Replace both checkAnswers functions with this updated version
const isAutoSubmitting = false;

const hasAutoSubmitted = false;
let timerInterval;

function checkAnswers(autoSubmit = false) {
  console.log("[v0] checkAnswers called with autoSubmit:", autoSubmit);

  if (isSubmittingExam && !autoSubmit) {
    console.log("[v0] Exam already submitting, ignoring manual submit");
    return;
  }

  if (!autoSubmit) {
    const submitBtn = document.querySelector(".submit-btn");
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
    submitBtn.disabled = true;
  }

  // Clear the timer interval if it exists
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  const surname = document.getElementById("surname").value.trim();
  const firstname = document.getElementById("firstname").value.trim();

  if (!surname || !firstname) {
    if (!autoSubmit) {
      alert("Please enter both your surname and first name before submitting.");
      const submitBtn = document.querySelector(".submit-btn");
      submitBtn.innerHTML = "Submit Exam";
      submitBtn.disabled = false;
    }
    return;
  }

  isSubmittingExam = true;
  submitExamDirectly();
}

function submitExamDirectly() {
  const surname = document.getElementById("surname").value.trim();
  const firstname = document.getElementById("firstname").value.trim();
  const username = `${surname} ${firstname}`;

  let score = 0;
  const responses = [];
  const totalQuestions = questionsData.length;

  questionsData.forEach((q, index) => {
    const selected = document.querySelector(
      `input[name="q${index + 1}"]:checked`
    );
    const isCorrect = selected && selected.value === q.correctAnswer;
    if (isCorrect) score++;

    responses.push({
      questionNumber: index + 1,
      selectedAnswer: selected ? selected.value : "No answer",
      correct: isCorrect,
    });
  });

  // Prepare result data
  const resultData = {
    timestamp: new Date().toISOString(),
    name: username,
    surname: surname,
    firstname: firstname,
    subject:
      localStorage.getItem("examSubject") ||
      document.getElementById("subject").value,
    class:
      localStorage.getItem("examClass") ||
      document.getElementById("class").value,
    score: score,
    totalQuestions: totalQuestions,
    percentage: ((score / totalQuestions) * 100).toFixed(1),
    responses: JSON.stringify(responses),
  };

  saveResult(resultData, isSubmittingExam);
}

// Save result to Google Sheets
async function saveResult(resultData, autoSubmit = false) {
  try {
    await fetch(sheetURL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...resultData,
        sheetName: getSheetName(resultData.subject, resultData.class),
      }),
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    displayResults(resultData, autoSubmit);
  } catch (error) {
    console.error("Error saving result:", error);
    displayResults(resultData, autoSubmit);
  }
}

// Display final results
function displayResults(resultData, autoSubmit = false) {
  const questionsDiv = document.getElementById("questions");

  const overlay = document.querySelector(".auto-submit-overlay");
  const notification = document.querySelector(".auto-submit-notification");
  if (overlay) overlay.remove();
  if (notification) notification.remove();

  const autoSubmitMessage = autoSubmit
    ? `<p class="auto-submit-message" style="color: green; font-weight: bold;text-align:center; margin-bottom: 20px;">.....</p>`
    : "";

  questionsDiv.innerHTML = `
    <div class="results-container">
      ${autoSubmitMessage}
      <h2><strong>${resultData.name}</strong>, Well done on your exam!</h2>
      <div class="results-summary">
        <p>Onto the next!!!</p>
      </div>
      <button onclick="window.location.href='index.html'" class="submit-btn">Take Another Exam</button>
    </div>
  `;

  // Clear the stored exam details
  localStorage.removeItem("examDay");
  localStorage.removeItem("examClass");
  localStorage.removeItem("examSubject");
}

// Initialize if on questions page
if (window.location.pathname.includes("questions.html")) {
  window.addEventListener("load", () => {
    const day = localStorage.getItem("examDay");
    const cls = localStorage.getItem("examClass");
    const subject = localStorage.getItem("examSubject");

    if (!day || !cls || !subject) {
      alert("Please select exam details first");
      window.location.href = "index.html";
      return;
    }

    // Display exam info
    document.getElementById("exam-info").innerHTML = `
      <h2>Exam Details</h2>
      <p>Day: ${day}</p>
      <p>Class: Primary ${cls.substring(1)}</p>
      <p>Subject: ${subject.replace(/_/g, " ")}</p>
    `;

    // Auto fetch questions
    fetchQuestions(day, cls, subject);
  });
}

// Timer functionality
const examDuration = 20 * 60; // 30 minutes in seconds

function startTimer() {
  const timerElement = document.getElementById("time-remaining");
  let timeLeft = examDuration;

  // Update timer immediately
  updateTimerDisplay(timeLeft);

  timerInterval = setInterval(() => {
    timeLeft--;

    // Update the timer display
    updateTimerDisplay(timeLeft);

    // Update progress bar
    const progressPercent = 100 - (timeLeft / examDuration) * 100;
    document.querySelector(
      ".progress-bar-fill"
    ).style.width = `${progressPercent}%`;

    if (timeLeft <= 0 && !isSubmittingExam) {
      isSubmittingExam = true;
      clearInterval(timerInterval);
      console.log("[v0] Auto-submit triggered - starting submission process");

      // Show auto-submit notification
      const notification = document.createElement("div");
      notification.className = "auto-submit-notification";
      notification.innerHTML = `
        <h2>Time's Up!</h2>
        <p>Your exam is being automatically submitted...</p>
        <div class="countdown">Submitting...</div>
      `;

      const overlay = document.createElement("div");
      overlay.className = "auto-submit-overlay";

      document.body.appendChild(overlay);
      document.body.appendChild(notification);

      setTimeout(() => {
        console.log("[v0] Calling checkAnswers with autoSubmit=true");
        checkAnswers(true);
      }, 1500);
      return;
    }

    // Warning when 10 minutes remaining
    if (timeLeft === 600) {
      showTimerWarning("10 Minutes Remaining!");
    }
    // Warning when 5 minutes remaining
    if (timeLeft === 300) {
      showTimerWarning("5 minutes remaining!");
    }
  }, 1000);
}

function updateTimerDisplay(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  document.getElementById("time-remaining").textContent = `${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;

  // Change color when less than 10 minutes remaining
  if (seconds < 600) {
    document.getElementById("time-remaining").style.color = "orange";
  }
  // Change color when less than 5 minutes remaining
  if (seconds < 300) {
    document.getElementById("time-remaining").style.color = "#ef4444";
  }
}

function showTimerWarning(message) {
  // Create a warning toast
  const toast = document.createElement("div");
  toast.className = "toast toast-warning";
  toast.innerHTML = message;
  document.body.appendChild(toast);

  // Remove toast after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// Add this to clear timer when exam is submitted
function addRadioChangeListeners() {
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      // Find the question container
      const questionContainer = e.target.closest(".question-container");
      if (questionContainer) {
        questionContainer.classList.remove("unanswered");
      }
    });
  });
}
