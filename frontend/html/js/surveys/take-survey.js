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

    async init() {
        if (!this.surveyId) {
            alert('No survey ID provided');
            window.location.href = 'user-dashboard.html';
            return;
        }

        await this.loadSurvey();
        if (this.survey) {
            this.displaySurvey();
            this.showQuestion(0);
        }
    }

    async loadSurvey() {
        try {
            const response = await fetch(`http://localhost:3000/api/surveys/${this.surveyId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load survey');
            }

            this.survey = await response.json();

            // Check if user already completed this survey
            if (this.survey.completed) {
                alert('You have already completed this survey');
                window.location.href = 'user-dashboard.html';
            }
        } catch (error) {
            console.error('Error loading survey:', error);
            alert('Failed to load survey');
            window.location.href = 'user-dashboard.html';
        }
    }

    displaySurvey() {
        document.getElementById('survey-title').textContent = this.survey.title;
        document.getElementById('survey-description').textContent = this.survey.description || '';
        document.getElementById('total-questions').textContent = this.survey.questions.length;
    }

    showQuestion(index) {
        if (index < 0 || index >= this.survey.questions.length) return;

        this.currentQuestionIndex = index;
        const question = this.survey.questions[index];
        const container = document.getElementById('question-container');

        // Update progress
        this.updateProgress();

        // Generate question HTML
        let questionHTML = `
            <div class="question">
                <h3>${question.text}</h3>
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

        question.options.forEach((option, index) => {
            html += `
                <label class="mc-option">
                    <input type="radio" 
                           name="mc" 
                           value="${option}" 
                           onchange="surveyTaker.saveResponse('${question.questionId}', '${option}')">
                    <span>${option}</span>
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
                      rows="4"></textarea>
        `;
    }

    saveResponse(questionId, value) {
        const question = this.survey.questions.find(q => q.questionId === questionId);
        this.responses[questionId] = {
            questionId: questionId,
            answer: value,
            category: question.category
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
                const radio = document.querySelector(`input[type="radio"][value="${savedResponse.answer}"]`);
                if (radio) radio.checked = true;
                break;
            case 'text':
                const textarea = document.querySelector('.text-response');
                if (textarea) textarea.value = savedResponse.answer;
                break;
        }
    }

    updateProgress() {
        const progress = ((this.currentQuestionIndex + 1) / this.survey.questions.length) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;
        document.getElementById('current-question').textContent = this.currentQuestionIndex + 1;
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        prevBtn.disabled = this.currentQuestionIndex === 0;

        if (this.currentQuestionIndex === this.survey.questions.length - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
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
            alert('Please answer this question before proceeding');
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
            alert(`Please answer all required questions. ${unanswered.length} questions remaining.`);
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/surveys/${this.surveyId}/response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
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
            alert('Failed to submit survey: ' + error.message);
        }
    }

    showCompletionMessage() {
        document.getElementById('survey-container').innerHTML = `
            <div class="completion-message">
                <div class="success-icon">✓</div>
                <h2>Thank you for completing the survey!</h2>
                <p>Your responses have been recorded and will help us measure the impact of this campaign.</p>
                ${this.survey.type === 'before' ?
                '<p>We\'ll invite you to take the post-campaign survey once the campaign concludes.</p>' :
                '<p>Your feedback will help us understand the campaign\'s effectiveness.</p>'
            }
                <button onclick="window.location.href='user-dashboard.html'" class="return-btn">
                    Return to Dashboard
                </button>
            </div>
        `;
    }
}

// Initialize survey taker
const surveyTaker = new SurveyTaker();
