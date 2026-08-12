class SurveyTaker {
    constructor() {
        this.surveyId = this.getSurveyIdFromUrl();
        this.survey = null;
        this.responses = {};
        this.currentQuestionIndex = 0;
        this.init();
    }

    getSurveyIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    getApiBaseUrl() {
        if (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) return API_BASE_URL;
        if (typeof API_URL !== 'undefined' && API_URL) return API_URL;
        return 'https://campaign-management-system-zquy.onrender.com/api';
    }

    async init() {
        if (!this.surveyId) {
            this.showError('No survey ID provided in the URL. Please select a survey from the Impact Surveys page.');
            return;
        }

        await this.loadSurvey();
        if (this.survey && !this.survey.completed) {
            this.displaySurvey();
            if (this.survey.questions && this.survey.questions.length > 0) {
                this.showQuestion(0);
            } else {
                this.showError('This survey currently has no questions.');
            }
        }
    }

    async loadSurvey() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.showError('Please login to take this survey.');
                return;
            }

            const response = await fetch(`${this.getApiBaseUrl()}/surveys/${this.surveyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Survey not found or server error');
            }

            const data = await response.json();
            this.survey = data.survey || data;

            // Check if user already completed this survey
            if (this.survey.completed) {
                this.showCompletedState();
            }
        } catch (error) {
            console.error('Error loading survey:', error);
            this.showError('Unable to load survey. ' + error.message);
        }
    }

    displaySurvey() {
        const titleEl = document.getElementById('survey-title');
        const descEl = document.getElementById('survey-description');
        const totalEl = document.getElementById('total-questions');
        const headerEl = document.getElementById('survey-header-card');

        if (titleEl) titleEl.textContent = this.survey.title || 'Impact Survey';
        if (descEl) descEl.textContent = this.survey.description || 'Share your feedback to help us measure campaign impact.';
        if (totalEl) totalEl.textContent = this.survey.questions ? this.survey.questions.length : 0;
        if (headerEl) headerEl.style.display = 'block';
    }

    showQuestion(index) {
        if (!this.survey || !this.survey.questions || index < 0 || index >= this.survey.questions.length) return;

        this.currentQuestionIndex = index;
        const question = this.survey.questions[index];
        const container = document.getElementById('question-container');
        if (!container) return;

        // Update progress
        this.updateProgress();

        // Generate question HTML
        let questionHTML = `
            <div class="question-card">
                <h3><span style="color: var(--light-brown); margin-right: 8px;">Q${index + 1}.</span>${this.escapeHtml(question.text)}</h3>
                <div class="answer-container">
        `;

        switch (question.type) {
            case 'rating':
            case 'scale':
                questionHTML += this.generateRatingQuestion(question);
                break;
            case 'multiple-choice':
                questionHTML += this.generateMultipleChoiceQuestion(question);
                break;
            case 'yes-no':
                questionHTML += this.generateYesNoQuestion(question);
                break;
            case 'text':
                questionHTML += this.generateTextQuestion(question);
                break;
            default:
                questionHTML += this.generateTextQuestion(question);
        }

        questionHTML += '</div></div>';
        container.innerHTML = questionHTML;

        // Restore previous answer if exists
        if (this.responses[question.questionId]) {
            this.restorePreviousAnswer(question);
        }

        // Update navigation buttons
        this.updateNavigationButtons();
    }

    generateRatingQuestion(question) {
        const scaleMax = question.scaleMax || 5;
        let html = '<div class="rating-scale">';

        for (let i = 1; i <= scaleMax; i++) {
            html += `
                <label class="rating-option">
                    <input type="radio" 
                           name="rating" 
                           value="${i}" 
                           onchange="surveyTaker.saveResponse('${question.questionId}', ${i})">
                    <span class="rating-label">${i}</span>
                </label>
            `;
        }

        html += `
            </div>
            <div class="scale-labels">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
            </div>
        `;

        return html;
    }

    generateMultipleChoiceQuestion(question) {
        let html = '<div class="multiple-choice-options">';
        const options = question.options || [];

        options.forEach((option) => {
            const safeOpt = this.escapeHtml(option);
            html += `
                <label class="mc-option">
                    <input type="radio" 
                           name="mc" 
                           value="${safeOpt}"
                           onchange="surveyTaker.saveResponse('${question.questionId}', '${safeOpt.replace(/'/g, "\\'")}')">
                    <span>${safeOpt}</span>
                </label>
            `;
        });

        html += '</div>';
        return html;
    }

    generateYesNoQuestion(question) {
        return `
            <div class="yes-no-options">
                <label class="yn-option">
                    <input type="radio" 
                           name="yn" 
                           value="yes" 
                           onchange="surveyTaker.saveResponse('${question.questionId}', 'yes')">
                    <span>Yes</span>
                </label>
                <label class="yn-option">
                    <input type="radio" 
                           name="yn" 
                           value="no" 
                           onchange="surveyTaker.saveResponse('${question.questionId}', 'no')">
                    <span>No</span>
                </label>
            </div>
        `;
    }

    generateTextQuestion(question) {
        return `
            <textarea class="text-response" 
                      placeholder="Type your answer here..." 
                      onchange="surveyTaker.saveResponse('${question.questionId}', this.value)"
                      oninput="surveyTaker.saveResponse('${question.questionId}', this.value)"
                      rows="4"></textarea>
        `;
    }

    saveResponse(questionId, value) {
        const question = this.survey.questions.find(q => q.questionId === questionId);
        this.responses[questionId] = {
            questionId: questionId,
            answer: value,
            category: question ? question.category : ''
        };
    }

    restorePreviousAnswer(question) {
        const savedResponse = this.responses[question.questionId];
        if (!savedResponse) return;

        switch (question.type) {
            case 'rating':
            case 'scale':
            case 'multiple-choice':
            case 'yes-no':
                const radio = document.querySelector(`input[type="radio"][value="${CSS.escape(savedResponse.answer)}"]`);
                if (radio) radio.checked = true;
                break;
            case 'text':
                const textarea = document.querySelector('.text-response');
                if (textarea) textarea.value = savedResponse.answer;
                break;
        }
    }

    updateProgress() {
        if (!this.survey || !this.survey.questions) return;
        const progress = ((this.currentQuestionIndex + 1) / this.survey.questions.length) * 100;
        const fillEl = document.getElementById('progress-fill');
        const currentEl = document.getElementById('current-question');
        if (fillEl) fillEl.style.width = `${progress}%`;
        if (currentEl) currentEl.textContent = this.currentQuestionIndex + 1;
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        if (prevBtn) prevBtn.disabled = this.currentQuestionIndex === 0;

        if (this.currentQuestionIndex === this.survey.questions.length - 1) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (submitBtn) submitBtn.style.display = 'inline-block';
        } else {
            if (nextBtn) nextBtn.style.display = 'inline-block';
            if (submitBtn) submitBtn.style.display = 'none';
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.showQuestion(this.currentQuestionIndex - 1);
        }
    }

    nextQuestion() {
        const currentQuestion = this.survey.questions[this.currentQuestionIndex];

        // Validate if required question is answered
        if (currentQuestion.required && !this.responses[currentQuestion.questionId]) {
            this.showNotice('Please answer this question before proceeding.');
            return;
        }

        if (this.currentQuestionIndex < this.survey.questions.length - 1) {
            this.showQuestion(this.currentQuestionIndex + 1);
        }
    }

    async submitSurvey() {
        // Validate all required questions are answered
        const unanswered = this.survey.questions.filter(q =>
            q.required && !this.responses[q.questionId]
        );

        if (unanswered.length > 0) {
            this.showNotice(`Please answer all required questions. ${unanswered.length} questions remaining.`);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.getApiBaseUrl()}/surveys/${this.surveyId}/response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    responses: Object.values(this.responses)
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to submit survey');
            }

            this.showCompletionMessage();
        } catch (error) {
            console.error('Error submitting survey:', error);
            this.showNotice('Failed to submit survey: ' + error.message);
        }
    }

    showCompletionMessage() {
        const container = document.getElementById('survey-container');
        if (!container) return;
        container.innerHTML = `
            <div class="completion-message">
                <div class="success-icon"><i class="fas fa-check"></i></div>
                <h2>Survey Submitted Successfully!</h2>
                <p>Thank you for your response. Your input directly helps us measure campaign effectiveness and scale social impact.</p>
                <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px; flex-wrap: wrap;">
                    <button onclick="window.location.href='survey-participation.html'" class="return-btn">
                        <i class="fas fa-list-check me-1"></i> Back to Impact Surveys
                    </button>
                    <button onclick="window.location.href='user-dashboard.html'" class="return-btn" style="background: var(--medium-grey); border: 1px solid rgba(255,255,255,0.2);">
                        <i class="fas fa-home me-1"></i> Dashboard
                    </button>
                </div>
            </div>
        `;
    }

    showCompletedState() {
        const container = document.getElementById('survey-container');
        if (!container) return;
        container.innerHTML = `
            <div class="completion-message" style="border-color: rgba(139, 107, 74, 0.4);">
                <div class="success-icon" style="background: rgba(139, 107, 74, 0.2); color: var(--light-brown); border-color: var(--brown);"><i class="fas fa-info-circle"></i></div>
                <h2>Already Completed</h2>
                <p>You have already submitted your response for this survey. Thank you for participating!</p>
                <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px; flex-wrap: wrap;">
                    <button onclick="window.location.href='survey-participation.html'" class="return-btn">
                        <i class="fas fa-arrow-left me-1"></i> Back to Impact Surveys
                    </button>
                </div>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('survey-container');
        if (!container) return;
        container.innerHTML = `
            <div class="completion-message" style="border-color: rgba(239, 68, 68, 0.4);">
                <div class="success-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.4);"><i class="fas fa-exclamation-triangle"></i></div>
                <h2>Survey Error</h2>
                <p style="color: var(--lighter-grey);">${this.escapeHtml(message)}</p>
                <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px; flex-wrap: wrap;">
                    <button onclick="window.location.href='survey-participation.html'" class="return-btn">
                        <i class="fas fa-arrow-left me-1"></i> Return to Surveys
                    </button>
                </div>
            </div>
        `;
    }

    showNotice(message) {
        let noticeBox = document.getElementById('survey-notice-box');
        if (!noticeBox) {
            noticeBox = document.createElement('div');
            noticeBox.id = 'survey-notice-box';
            noticeBox.style.cssText = 'background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px; font-weight: 500; text-align: center;';
            const qContainer = document.getElementById('question-container');
            if (qContainer && qContainer.parentNode) {
                qContainer.parentNode.insertBefore(noticeBox, qContainer);
            }
        }
        noticeBox.textContent = message;
        noticeBox.style.display = 'block';
        setTimeout(() => {
            if (noticeBox) noticeBox.style.display = 'none';
        }, 3500);
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Initialize survey taker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.surveyTaker = new SurveyTaker();
});
