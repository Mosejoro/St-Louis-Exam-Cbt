// API Configuration for Malpractice Examination System
const apiKey = "AIzaSyAq-OpHyYcqlK5rtNJ8MBtPP4LcCVotzcU"
const sheetId = "1CSNKDZZdz4ZKL28o2jPUcbGJ8xM85Jifpan_mxaZVKQ"
const sheetURL =
  "https://script.google.com/macros/s/AKfycbx3-EjFsnOgcQBFwSt-xN9C2dNo9HcW_X93uIcZOPYupLlyXbGlc29mYK-QhHw-IfJHOQ/exec"

// Helper Functions
function getSheetName(subject, classLevel) {
  return `Malpractice_${subject.replace(/\s+/g, "")}_${classLevel}`
}

// Enhanced notification system
function showNotification(message, type = "info", duration = 4000) {
  const notification = document.createElement("div")
  notification.className = `notification ${type}`

  const icon = type === "error" ? "❌" : type === "success" ? "✅" : type === "warning" ? "⚠️" : "ℹ️"

  notification.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-message">${message}</div>
  `

  document.body.appendChild(notification)

  // Trigger animation
  requestAnimationFrame(() => {
    notification.classList.add("show")
  })

  // Auto remove
  setTimeout(() => {
    notification.classList.remove("show")
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 300)
  }, duration)
}

// Store questions data globally
let questionsData = []
let examStartTime = null

// Enhanced shuffle function with better randomization
function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Fetch and Display Questions with enhanced error handling
async function fetchQuestions(day, cls, subject) {
  if (!subject) {
    showNotification("Please select a subject.", "error")
    return
  }

  const sheetName = getSheetName(subject, cls)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${apiKey}`

  try {
    showNotification("Loading your re-examination questions...", "info", 2000)

    const response = await fetch(url)
    const data = await response.json()

    if (!data.values || data.values.length <= 1) {
      throw new Error(`No questions found for ${sheetName}`)
    }

    examStartTime = new Date()
    displayQuestions(data.values, subject, cls)
    showNotification("Questions loaded successfully! Good luck!", "success", 3000)
  } catch (error) {
    console.error("Error fetching questions:", error)
    document.getElementById("questions").innerHTML = `
      <div class="error-container">
        <div class="error-icon">📚</div>
        <h3>Questions Not Available</h3>
        <p class="error-message">
          ${subject.replace(/_/g, " ")} re-examination for ${cls} is not yet available.
        </p>
        <p class="error-subtitle">
          Please verify your selection or contact your teacher.
        </p>
        <button onclick="window.location.href='index.html'" class="back-btn">
          ← Go Back to Selection
        </button>
      </div>
    `
  }
}

// Enhanced question display with better UI
function displayQuestions(data, subject, cls) {
  const questionsDiv = document.getElementById("questions")
  questionsDiv.innerHTML = ""
  questionsData = []

  if (!data || data.length <= 1) {
    questionsDiv.innerHTML = `
      <div class="no-questions">
        <div class="no-questions-icon">📝</div>
        <h3>No Questions Available</h3>
        <p>There are currently no questions for this subject and class.</p>
      </div>
    `
    return
  }

  // Process questions with enhanced shuffling
  const headerRow = data[0]
  const questionRows = data.slice(1)

  // Enhanced shuffling: keep first 10 questions fixed for consistency
  const fixedQuestions = questionRows.slice(0, 10)
  const questionsToShuffle = questionRows.slice(10)
  const shuffledRemainingQuestions = shuffleArray(questionsToShuffle)
  const finalQuestionRows = [...fixedQuestions, ...shuffledRemainingQuestions]

  // Add student info section with enhanced styling
  questionsDiv.innerHTML = `
    <div class="student-info">
      <div class="student-info-header">
        <h3>📝 Student Information</h3>
        <p>Please enter your details before starting the re-examination</p>
      </div>
      <div class="name-inputs">
        <div class="input-group">
          <label for="surname">
            <span class="input-icon">👤</span>
            Surname:
          </label>
          <input 
            class="Input" 
            type="text" 
            id="surname" 
            placeholder="Enter your surname" 
            oninput="this.value = this.value.toUpperCase()" 
            required
          >
        </div>
        <div class="input-group">
          <label for="firstname">
            <span class="input-icon">👤</span>
            First Name:
          </label>
          <input 
            class="Input" 
            type="text" 
            id="firstname" 
            placeholder="Enter your first name" 
            oninput="this.value = this.value.toUpperCase()" 
            required
          >
        </div>
      </div>
      <div class="exam-instructions">
        <div class="instruction-item">
          <span class="instruction-icon">⏰</span>
          <span>You have 45 minutes to complete this re-examination</span>
        </div>
        <div class="instruction-item">
          <span class="instruction-icon">✅</span>
          <span>Answer all questions before submitting</span>
        </div>
        <div class="instruction-item">
          <span class="instruction-icon">🚫</span>
          <span>No malpractice will be tolerated</span>
        </div>
      </div>
    </div>
  `

  // Create questions with enhanced options shuffling
  finalQuestionRows.forEach((row, i) => {
    const questionText = row[0]
    const originalOptions = {
      A: row[1],
      B: row[2],
      C: row[3],
      D: row[4],
    }
    const correctAnswer = row[5]

    // Enhanced option shuffling while preserving correct answer mapping
    const optionEntries = Object.entries(originalOptions)
    const shuffledEntries = shuffleArray(optionEntries)
    const shuffledOptions = Object.fromEntries(shuffledEntries)

    // Find new position of correct answer
    const originalIndex = Object.keys(originalOptions).indexOf(correctAnswer)
    const newCorrectAnswerKey = Object.keys(shuffledOptions)[originalIndex]

    questionsData.push({
      questionNumber: i + 1,
      correctAnswer: newCorrectAnswerKey,
      subject,
      cls,
      originalAnswer: correctAnswer,
    })

    // Process question for images
    const { processedText, imageHtmlContent } = processQuestionImages(questionText, i + 1)

    const questionHTML = `
      <div class="question-container" data-question="${i + 1}">
        <div class="question-header">
          <span class="question-number">Question ${i + 1}</span>
          <span class="question-badge">Re-exam</span>
        </div>
        <div class="question-text">${processedText}</div>
        ${imageHtmlContent}
        <div class="options-container">
          ${Object.entries(shuffledOptions)
            .map(
              ([key, value]) => `
            <label class="option-label">
              <input type="radio" name="q${i + 1}" value="${key}" required>
              <span class="option-text">
                <span class="option-letter">${key}</span>
                ${value}
              </span>
            </label>
          `,
            )
            .join("")}
        </div>
      </div>
    `

    questionsDiv.innerHTML += questionHTML
  })

  // Add enhanced submit button
  questionsDiv.innerHTML += `
    <div class="submit-section">
      <div class="submit-warning">
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">
          <strong>Important:</strong> Make sure you have answered all questions before submitting. 
          You cannot change your answers after submission.
        </div>
      </div>
      <button onclick="checkAnswers()" class="submit-btn">
        <span class="submit-icon">📤</span>
        Submit Re-examination
        <div class="submit-loader" style="display: none;">
          <div class="loading-spinner"></div>
          Processing...
        </div>
      </button>
    </div>
  `

  // Setup enhanced interactions
  addRadioChangeListeners()
  setupImageErrorHandling()
  setupQuestionTracking()
}

// Enhanced image processing with better error handling
function processQuestionImages(questionText, questionNumber) {
  let processedText = questionText
  let imageHtmlContent = ""

  // Google Drive regex patterns
  const googleDriveRegex =
    /(https?:\/\/drive\.google\.com\/file\/d\/([^/\s]+)\/view[^\s]*|https?:\/\/drive\.google\.com\/open\?id=([^\s&]+))/gi
  const standardImageRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg))/gi

  // Process Google Drive links
  const driveMatches = [...questionText.matchAll(googleDriveRegex)]
  if (driveMatches.length > 0) {
    driveMatches.forEach((match) => {
      const fullUrl = match[0]
      const fileId = match[2] || match[3]

      if (fileId) {
        const directImageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`
        processedText = processedText.replace(fullUrl, "")

        imageHtmlContent += `
          <div class="question-image-container">
            <img 
              src="${directImageUrl}" 
              alt="Question ${questionNumber} image" 
              class="question-image" 
              data-source="google-drive"
              loading="lazy"
            >
            <div class="image-overlay">
              <button class="image-expand" onclick="expandImage(this)">🔍</button>
            </div>
          </div>
        `
      }
    })
  } else {
    // Process standard image URLs
    const standardMatches = [...questionText.matchAll(standardImageRegex)]
    standardMatches.forEach((match) => {
      const imageUrl = match[0]
      processedText = processedText.replace(imageUrl, "")

      imageHtmlContent += `
        <div class="question-image-container">
          <img 
            src="${imageUrl}" 
            alt="Question ${questionNumber} image" 
            class="question-image"
            loading="lazy"
          >
          <div class="image-overlay">
            <button class="image-expand" onclick="expandImage(this)">🔍</button>
          </div>
        </div>
      `
    })
  }

  return { processedText, imageHtmlContent }
}

// Enhanced image error handling
function setupImageErrorHandling() {
  document.querySelectorAll(".question-image").forEach((img) => {
    img.addEventListener("load", function () {
      this.classList.add("loaded")
    })

    img.addEventListener("error", function () {
      const container = this.closest(".question-image-container")
      const errorMessage =
        this.dataset.source === "google-drive"
          ? "Google Drive image could not be loaded. Please ensure the file is publicly accessible."
          : "Image could not be loaded. Please check the URL."

      container.innerHTML = `
        <div class="image-error">
          <div class="error-icon">🖼️</div>
          <h4>Image Loading Error</h4>
          <p>${errorMessage}</p>
          <details>
            <summary>Technical Details</summary>
            <small>${this.src}</small>
          </details>
        </div>
      `
    })
  })
}

// Enhanced answer checking with better validation
function checkAnswers() {
  const submitBtn = document.querySelector(".submit-btn")
  const submitLoader = submitBtn.querySelector(".submit-loader")
  const submitIcon = submitBtn.querySelector(".submit-icon")

  // Show loading state
  submitIcon.style.display = "none"
  submitLoader.style.display = "flex"
  submitBtn.disabled = true

  // Clear timer
  if (timerInterval) {
    clearInterval(timerInterval)
  }

  // Validate student information
  const surname = document.getElementById("surname")?.value.trim()
  const firstname = document.getElementById("firstname")?.value.trim()

  if (!surname || !firstname) {
    showNotification("Please enter both your surname and first name before submitting.", "error")
    resetSubmitButton(submitBtn, submitIcon, submitLoader)
    startTimer()
    return
  }

  // Enhanced unanswered question detection
  const unansweredQuestions = findUnansweredQuestions()

  if (unansweredQuestions.length > 0) {
    handleUnansweredQuestions(unansweredQuestions, submitBtn, submitIcon, submitLoader)
    return
  }

  // Calculate results
  const results = calculateResults(surname, firstname)

  // Save results
  saveResult(results)
}

// Enhanced unanswered question detection
function findUnansweredQuestions() {
  const unanswered = []

  questionsData.forEach((_, index) => {
    const questionNum = index + 1
    const radioButtons = document.querySelectorAll(`input[name="q${questionNum}"]`)
    const isAnswered = Array.from(radioButtons).some((radio) => radio.checked)

    if (!isAnswered) {
      unanswered.push(questionNum)
    }
  })

  return unanswered
}

// Enhanced handling of unanswered questions
function handleUnansweredQuestions(unansweredQuestions, submitBtn, submitIcon, submitLoader) {
  resetSubmitButton(submitBtn, submitIcon, submitLoader)

  // Clear previous markings
  document.querySelectorAll(".question-container").forEach((container) => {
    container.classList.remove("unanswered")
  })

  // Mark unanswered questions
  unansweredQuestions.forEach((qNum) => {
    const container = document.querySelector(`[data-question="${qNum}"]`)
    if (container) {
      container.classList.add("unanswered")
    }
  })

  // Show detailed notification
  const message = `Please answer the following questions before submitting:\n${unansweredQuestions.map((q) => `• Question ${q}`).join("\n")}`
  showNotification(message, "warning", 6000)

  // Scroll to first unanswered question
  const firstUnanswered = document.querySelector(".question-container.unanswered")
  if (firstUnanswered) {
    firstUnanswered.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  startTimer()
}

// Calculate results with enhanced analytics
function calculateResults(surname, firstname) {
  let score = 0
  const responses = []
  const totalQuestions = questionsData.length
  const examEndTime = new Date()
  const timeSpent = examEndTime - examStartTime

  questionsData.forEach((q, index) => {
    const selected = document.querySelector(`input[name="q${index + 1}"]:checked`)
    const isCorrect = selected && selected.value === q.correctAnswer

    if (isCorrect) score++

    responses.push({
      questionNumber: index + 1,
      selectedAnswer: selected?.value || "No Answer",
      correctAnswer: q.correctAnswer,
      isCorrect,
      subject: q.subject,
      class: q.cls,
    })
  })

  return {
    timestamp: new Date().toISOString(),
    name: `${surname} ${firstname}`,
    surname: surname,
    firstname: firstname,
    subject: localStorage.getItem("malpracticeExamSubject") || questionsData[0]?.subject,
    class: localStorage.getItem("malpracticeExamClass") || questionsData[0]?.cls,
    examType: "Malpractice Re-examination",
    score: score,
    totalQuestions: totalQuestions,
    percentage: ((score / totalQuestions) * 100).toFixed(1),
    timeSpent: Math.round(timeSpent / 1000 / 60), // in minutes
    responses: JSON.stringify(responses),
    passed: score >= Math.ceil(totalQuestions * 0.5), // 50% pass mark
  }
}

// Reset submit button to original state
function resetSubmitButton(submitBtn, submitIcon, submitLoader) {
  submitIcon.style.display = "inline"
  submitLoader.style.display = "none"
  submitBtn.disabled = false
}

// Enhanced result saving with better error handling
async function saveResult(resultData) {
  try {
    showNotification("Saving your results...", "info", 2000)

    await fetch(sheetURL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...resultData,
        sheetName: `Malpractice_Results_${resultData.class}`,
      }),
    })

    // Add delay to ensure data is saved
    await new Promise((resolve) => setTimeout(resolve, 1500))

    displayResults(resultData)
    showNotification("Results saved successfully!", "success")
  } catch (error) {
    console.error("Error saving result:", error)
    showNotification("Results saved locally. Please inform your teacher.", "warning")
    displayResults(resultData)
  }
}

// Enhanced results display
function displayResults(resultData) {
  const questionsDiv = document.getElementById("questions")
  const passStatus = resultData.passed ? "passed" : "needs-improvement"
  const passIcon = resultData.passed ? "🎉" : "📚"
  const passMessage = resultData.passed
    ? "Congratulations! You have successfully completed your re-examination."
    : "Keep studying! You can improve with more practice."

  questionsDiv.innerHTML = `
    <div class="results-container ${passStatus}">
      <div class="results-header">
        <div class="results-icon">${passIcon}</div>
        <h2 class="results-title">Re-examination Complete!</h2>
        <div class="student-name">${resultData.name}</div>
      </div>
      
      <div class="results-summary">
        <div class="result-card">
          <div class="result-label">Your Score</div>
          <div class="result-value">${resultData.score}/${resultData.totalQuestions}</div>
          <div class="result-percentage">${resultData.percentage}%</div>
        </div>
        
        <div class="result-card">
          <div class="result-label">Time Spent</div>
          <div class="result-value">${resultData.timeSpent}</div>
          <div class="result-unit">minutes</div>
        </div>
        
        <div class="result-card">
          <div class="result-label">Status</div>
          <div class="result-value ${passStatus}">
            ${resultData.passed ? "Passed" : "Needs Review"}
          </div>
        </div>
      </div>
      
      <div class="results-message">
        <p>${passMessage}</p>
        <p class="encouragement">
          ${
            resultData.passed
              ? "Well done on completing your re-examination successfully!"
              : "Don't give up! Every mistake is a learning opportunity."
          }
        </p>
      </div>
      
      <div class="results-actions">
        <button onclick="window.location.href='index.html'" class="action-btn primary">
          <span class="btn-icon">🔄</span>
          Take Another Re-exam
        </button>
        <button onclick="window.print()" class="action-btn secondary">
          <span class="btn-icon">🖨️</span>
          Print Results
        </button>
      </div>
    </div>
  `

  // Clear stored exam details
  localStorage.removeItem("malpracticeExamDay")
  localStorage.removeItem("malpracticeExamClass")
  localStorage.removeItem("malpracticeExamSubject")
}

// Enhanced radio button change listeners
function addRadioChangeListeners() {
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const questionContainer = e.target.closest(".question-container")
      if (questionContainer) {
        questionContainer.classList.remove("unanswered")
        questionContainer.classList.add("answered")

        // Update progress
        updateProgress()
      }
    })
  })
}

// Question tracking for better UX
function setupQuestionTracking() {
  const questions = document.querySelectorAll(".question-container")

  // Add intersection observer for scroll tracking
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view")
        }
      })
    },
    { threshold: 0.5 },
  )

  questions.forEach((question) => {
    observer.observe(question)
  })
}

// Update progress based on answered questions
function updateProgress() {
  const totalQuestions = questionsData.length
  const answeredQuestions = document.querySelectorAll(".question-container.answered").length
  const progressPercent = (answeredQuestions / totalQuestions) * 100

  const progressFill = document.querySelector(".progress-bar-fill")
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`
  }
}

// Enhanced timer functionality for malpractice exam (45 minutes)
const examDuration = 45 * 60 // 45 minutes in seconds
let timerInterval

function startTimer() {
  const timerElement = document.getElementById("time-remaining")
  let timeLeft = examDuration

  updateTimerDisplay(timeLeft)

  timerInterval = setInterval(() => {
    timeLeft--
    updateTimerDisplay(timeLeft)

    // Warning notifications
    if (timeLeft === 900) {
      // 15 minutes remaining
      showTimerWarning("15 minutes remaining!", "warning")
    }
    if (timeLeft === 300) {
      // 5 minutes remaining
      showTimerWarning("5 minutes remaining! Please review your answers.", "error")
    }
    if (timeLeft === 60) {
      // 1 minute remaining
      showTimerWarning("1 minute remaining! Prepare to submit.", "error")
    }

    // Auto-submit when time runs out
    if (timeLeft <= 0) {
      clearInterval(timerInterval)
      showNotification("Time's up! Your re-examination will be submitted automatically.", "error")
      setTimeout(() => {
        checkAnswers()
      }, 2000)
    }
  }, 1000)
}

function updateTimerDisplay(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  const timerElement = document.getElementById("time-remaining")

  if (timerElement) {
    timerElement.textContent = `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`

    // Change styling based on time remaining
    if (seconds < 300) {
      // Less than 5 minutes
      timerElement.classList.add("warning")
      document.querySelector(".timer-widget").classList.add("urgent")
    } else if (seconds < 900) {
      // Less than 15 minutes
      timerElement.classList.add("caution")
    }
  }
}

function showTimerWarning(message, type) {
  showNotification(message, type, 5000)

  // Add visual emphasis to timer
  const timerWidget = document.querySelector(".timer-widget")
  if (timerWidget) {
    timerWidget.classList.add("pulse")
    setTimeout(() => {
      timerWidget.classList.remove("pulse")
    }, 1000)
  }
}

// Image expansion functionality
function expandImage(button) {
  const img = button.closest(".question-image-container").querySelector(".question-image")
  const modal = document.createElement("div")
  modal.className = "image-modal"
  modal.innerHTML = `
    <div class="image-modal-content">
      <button class="image-modal-close" onclick="this.closest('.image-modal').remove()">×</button>
      <img src="${img.src}" alt="${img.alt}" class="expanded-image">
    </div>
  `

  document.body.appendChild(modal)

  // Close on background click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

// Initialize exam when on questions page
if (window.location.pathname.includes("questions.html")) {
  window.addEventListener("load", () => {
    const day = localStorage.getItem("malpracticeExamDay")
    const cls = localStorage.getItem("malpracticeExamClass")
    const subject = localStorage.getItem("malpracticeExamSubject")

    if (!day || !cls || !subject) {
      showNotification("Please select exam details first", "error")
      setTimeout(() => {
        window.location.href = "index.html"
      }, 2000)
      return
    }

    // Auto fetch questions and start timer
    fetchQuestions(day, cls, subject).then(() => {
      startTimer()
    })
  })
}

// Enhanced keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + Enter to submit
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    const submitBtn = document.querySelector(".submit-btn")
    if (submitBtn && !submitBtn.disabled) {
      checkAnswers()
    }
  }

  // Escape to close modals
  if (e.key === "Escape") {
    const modal = document.querySelector(".image-modal")
    if (modal) {
      modal.remove()
    }
  }
})

// Prevent accidental page refresh during exam
window.addEventListener("beforeunload", (e) => {
  if (document.querySelector(".question-container")) {
    e.preventDefault()
    e.returnValue = "Are you sure you want to leave? Your progress will be lost."
  }
})

// Auto-save functionality (optional enhancement)
function autoSaveProgress() {
  const answers = {}
  questionsData.forEach((_, index) => {
    const selected = document.querySelector(`input[name="q${index + 1}"]:checked`)
    if (selected) {
      answers[`q${index + 1}`] = selected.value
    }
  })

  localStorage.setItem(
    "malpracticeAutoSave",
    JSON.stringify({
      answers,
      timestamp: new Date().toISOString(),
    }),
  )
}

// Restore auto-saved progress
function restoreProgress() {
  const saved = localStorage.getItem("malpracticeAutoSave")
  if (saved) {
    try {
      const { answers } = JSON.parse(saved)
      Object.entries(answers).forEach(([questionName, value]) => {
        const radio = document.querySelector(`input[name="${questionName}"][value="${value}"]`)
        if (radio) {
          radio.checked = true
          radio.closest(".question-container").classList.add("answered")
        }
      })
      updateProgress()
      showNotification("Previous answers restored", "info", 2000)
    } catch (error) {
      console.error("Error restoring progress:", error)
    }
  }
}

// Set up auto-save every 30 seconds
setInterval(autoSaveProgress, 30000)
