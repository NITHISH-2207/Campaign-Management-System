class SurveyBuilder {
    constructor() {
        this.questions = [];
        this.campaignId = null;
        this.questionCounter = 0;
        this.init();
    }

    async init() {
        // Check authentication first
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!['campaign_manager', 'admin'].includes(user.role)) {
            alert('You do not have permission to create surveys');
            window.location.href = 'survey-management.html';
            return;
        }

        await this.loadCampaigns();
        this.setupEventListeners();

        // Add initial question
        this.addQuestion();
    }

    async loadCampaigns() {
        try {
            const response = await fetch('http://campaign-management-system-zquy.onrender.com/api/campaigns/my-campaigns', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const campaigns = await response.json();
                this.populateCampaignDropdown(campaigns);
            } else {
                console.error('Failed to load campaigns');
                this.showError('Failed to load campaigns');
            }
        } catch (error) {
            console.error('Error loading campaigns:', error);
            this.showError('Error loading campaigns');
        }
    }

    populateCampaignDropdown(campaigns) {
        const select = document.getElementById('campaign-select');
        if (!select) {
            console.error('Campaign select element not found');
            return;
        }

        select.innerHTML = '<option value="">Select a campaign</option>';

        if (campaigns.length === 0) {
            select.innerHTML += '<option value="" disabled>No campaigns available</option>';
            return;
        }

        campaigns.forEach(campaign => {
            const option = document.createElement('option');
            option.value = campaign._id;
            option.textContent = campaign.title;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        const addBtn = document.getElementById('add-question-btn');
        const form = document.getElementById('survey-form');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.addQuestion());
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createSurvey();
            });
        }
    }

    addQuestion() {
        this.questionCounter++;
        const questionId = `q_${Date.now()}_${this.questionCounter}`;
        const questionNumber = document.querySelectorAll('.question-block').length + 1;

        const questionHtml = `
            <div class="question-block" data-question-id="${questionId}">
                <div class="question-header">
                    <h4>Question ${questionNumber}</h4>
                    <button type="button" class="remove-btn" onclick="surveyBuilder.removeQuestion('${questionId}')">
                        Remove
                    </button>
                </div>
                
                <div class="form-group">
                    <input type="text" 
                           class="question-text form-control" 
                           placeholder="Enter your question" 
                           required>
                </div>
                
                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label>Question Type</label>
                        <select class="question-type form-control" onchange="surveyBuilder.updateQuestionType('${questionId}')">
                            <option value="rating">Rating (1-5)</option>
                            <option value="scale">Custom Scale</option>
                            <option value="multiple-choice">Multiple Choice</option>
                            <option value="yes-no">Yes/No</option>
                            <option value="text">Text Response</option>
                        </select>
                    </div>
                    
                    <div class="form-group col-md-6">
                        <label>Category</label>
                        <select class="question-category form-control" required>
                            <option value="">Select category</option>
                            <option value="awareness">Awareness</option>
                            <option value="behavior">Behavior</option>
                            <option value="attitude">Attitude</option>
                            <option value="knowledge">Knowledge</option>
                        </select>
                    </div>
                </div>
                
                <div class="question-options" id="options-${questionId}">
                    <!-- Dynamic content based on question type -->
                </div>
            </div>
        `;

        const container = document.getElementById('questions-container');
        if (container) {
            container.insertAdjacentHTML('beforeend', questionHtml);
            this.questions.push({ id: questionId });
            this.updateQuestionNumbers();
        }
    }

    updateQuestionType(questionId) {
        const block = document.querySelector(`[data-question-id="${questionId}"]`);
        if (!block) return;

        const type = block.querySelector('.question-type').value;
        const optionsContainer = document.getElementById(`options-${questionId}`);

        let optionsHtml = '';

        switch (type) {
            case 'scale':
                optionsHtml = `
                    <div class="scale-options form-group">
                        <label>Scale Range</label>
                        <div class="form-row">
                            <div class="col">
                                <input type="number" class="form-control scale-min" 
                                       placeholder="Min" value="1" min="0">
                            </div>
                            <div class="col-auto">to</div>
                            <div class="col">
                                <input type="number" class="form-control scale-max" 
                                       placeholder="Max" value="5" min="1">
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'multiple-choice':
                optionsHtml = `
                    <div class="options-container">
                        <label>Options</label>
                        <div class="options-list" id="options-list-${questionId}">
                            ${this.createOptionInput(questionId, 1)}
                            ${this.createOptionInput(questionId, 2)}
                        </div>
                        <button type="button" class="btn btn-sm btn-secondary mt-2" 
                                onclick="surveyBuilder.addOption('${questionId}')">
                            + Add Option
                        </button>
                    </div>
                `;
                break;
        }

        if (optionsContainer) {
            optionsContainer.innerHTML = optionsHtml;
        }
    }

    createOptionInput(questionId, optionNumber) {
        return `
            <div class="option-input input-group mb-2">
                <input type="text" class="form-control" 
                       placeholder="Option ${optionNumber}" required>
                <div class="input-group-append">
                    <button type="button" class="btn btn-outline-danger" 
                            onclick="surveyBuilder.removeOption(this)">×</button>
                </div>
            </div>
        `;
    }

    addOption(questionId) {
        const optionsList = document.getElementById(`options-list-${questionId}`);
        if (!optionsList) return;

        const optionCount = optionsList.children.length + 1;
        const optionHtml = this.createOptionInput(questionId, optionCount);

        optionsList.insertAdjacentHTML('beforeend', optionHtml);
    }

    removeOption(button) {
        const optionInput = button.closest('.option-input');
        const optionsList = optionInput.closest('.options-list');

        // Ensure at least 2 options remain
        if (optionsList.children.length > 2) {
            optionInput.remove();
            // Renumber remaining options
            const options = optionsList.querySelectorAll('input');
            options.forEach((input, index) => {
                input.placeholder = `Option ${index + 1}`;
            });
        } else {
            alert('Multiple choice questions must have at least 2 options');
        }
    }

    removeQuestion(questionId) {
        // Ensure at least one question remains
        if (this.questions.length <= 1) {
            alert('Survey must have at least one question');
            return;
        }

        const block = document.querySelector(`[data-question-id="${questionId}"]`);
        if (block) {
            block.remove();
            this.questions = this.questions.filter(q => q.id !== questionId);
            this.updateQuestionNumbers();
        }
    }

    updateQuestionNumbers() {
        const blocks = document.querySelectorAll('.question-block');
        blocks.forEach((block, index) => {
            const header = block.querySelector('h4');
            if (header) {
                header.textContent = `Question ${index + 1}`;
            }
        });
    }

    collectQuestions() {
        const questions = [];
        const questionBlocks = document.querySelectorAll('.question-block');

        questionBlocks.forEach((block, index) => {
            const questionId = block.dataset.questionId;
            const question = {
                questionId,
                text: block.querySelector('.question-text').value.trim(),
                type: block.querySelector('.question-type').value,
                category: block.querySelector('.question-category').value,
                required: true,
                order: index + 1
            };

            // Handle type-specific data
            switch (question.type) {
                case 'scale':
                    const scaleMin = block.querySelector('.scale-min');
                    const scaleMax = block.querySelector('.scale-max');
                    if (scaleMin && scaleMax) {
                        question.scaleMin = parseInt(scaleMin.value) || 1;
                        question.scaleMax = parseInt(scaleMax.value) || 5;
                    }
                    break;

                case 'multiple-choice':
                    const options = Array.from(block.querySelectorAll('.option-input input'))
                        .map(input => input.value.trim())
                        .filter(val => val !== '');
                    question.options = options;
                    break;
            }

            questions.push(question);
        });

        return questions;
    }

    validateSurvey(surveyData) {
        const errors = [];

        if (!surveyData.title || surveyData.title.trim() === '') {
            errors.push('Survey title is required');
        }

        if (!surveyData.campaignId) {
            errors.push('Please select a campaign');
        }

        if (!surveyData.type) {
            errors.push('Please select survey type');
        }

        if (surveyData.questions.length === 0) {
            errors.push('Survey must have at least one question');
        }

        // Validate each question
        surveyData.questions.forEach((question, index) => {
            if (!question.text || question.text === '') {
                errors.push(`Question ${index + 1} text is required`);
            }

            if (!question.category) {
                errors.push(`Question ${index + 1} category is required`);
            }

            if (question.type === 'multiple-choice') {
                if (!question.options || question.options.length < 2) {
                    errors.push(`Question ${index + 1} must have at least 2 options`);
                }
            }

            if (question.type === 'scale') {
                if (question.scaleMin >= question.scaleMax) {
                    errors.push(`Question ${index + 1}: Scale minimum must be less than maximum`);
                }
            }
        });

        return errors;
    }

    async createSurvey() {
        const questions = this.collectQuestions();

        const surveyData = {
            title: document.getElementById('survey-title')?.value.trim(),
            description: document.getElementById('survey-description')?.value.trim(),
            campaignId: document.getElementById('campaign-select')?.value, // This should match backend
            type: document.getElementById('survey-type')?.value,
            questions
        };

        // Validate
        const errors = this.validateSurvey(surveyData);
        if (errors.length > 0) {
            alert('Please fix the following errors:\n\n' + errors.join('\n'));
            return;
        }

        // Show loading state
        const submitBtn = document.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating survey...';

        try {
            const response = await fetch('http://campaign-management-system-zquy.onrender.com/api/surveys/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(surveyData)
            });

            const result = await response.json();

            if (response.ok) {
                alert('Survey created successfully!');
                window.location.href = 'survey-management.html';
            } else {
                throw new Error(result.error || 'Failed to create survey');
            }
        } catch (error) {
            console.error('Error creating survey:', error);
            alert(`Failed to create survey: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    showError(message) {
        // You can implement a toast notification here
        console.error(message);
        alert(message);
    }
}

// Initialize survey builder
const surveyBuilder = new SurveyBuilder();
