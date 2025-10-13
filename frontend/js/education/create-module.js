// Use IIFE to avoid global scope conflicts
(function() {
    // Module-specific configuration
    const MODULE_API_URL = window.API_URL || 'http://localhost:3000/api';
    let currentContentType = 'article';
    let resources = [];
    let quizQuestions = [];

    // Check if user is campaign manager
    document.addEventListener('DOMContentLoaded', () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!user.id) {
            alert('Please login to continue');
            window.location.href = 'login.html';
            return;
        }
        
        if (!['campaign_manager', 'admin'].includes(user.role)) {
            alert('You do not have permission to create modules');
            window.location.href = 'education-library.html';
            return;
        }

        console.log('User authorized to create modules:', user);
    });

    // Content type switching
    window.switchContentType = function(type) {
        currentContentType = type;
        
        // Update UI
        document.querySelectorAll('.editor-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Show/hide content sections
        document.querySelectorAll('.content-type').forEach(section => {
            section.style.display = 'none';
        });
        
        if (type === 'text') {
            document.getElementById('textContent').style.display = 'block';
        } else if (type === 'video') {
            document.getElementById('videoContent').style.display = 'block';
        } else if (type === 'mixed') {
            document.getElementById('textContent').style.display = 'block';
            document.getElementById('videoContent').style.display = 'block';
        }
    }

    // Resource management
    window.addResource = function() {
        const resourceId = Date.now();
        const resourceHtml = `
            <div class="resource-item" data-resource-id="${resourceId}">
                <input type="text" placeholder="Resource Title (Optional)" id="resourceTitle_${resourceId}">
                <input type="url" placeholder="Resource URL (Optional)" id="resourceUrl_${resourceId}">
                <select id="resourceType_${resourceId}">
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="article">Article</option>
                    <option value="external">External Link</option>
                </select>
                <button type="button" class="btn-danger" onclick="removeResource(${resourceId})">Remove</button>
            </div>
        `;
        
        document.getElementById('resourcesContainer').insertAdjacentHTML('beforeend', resourceHtml);
        resources.push(resourceId);
    }

    window.removeResource = function(resourceId) {
        document.querySelector(`[data-resource-id="${resourceId}"]`).remove();
        resources = resources.filter(id => id !== resourceId);
    }

    // Quiz builder
    window.toggleQuizBuilder = function() {
        const quizBuilder = document.getElementById('quizBuilder');
        const includeQuiz = document.getElementById('includeQuiz').checked;
        
        quizBuilder.style.display = includeQuiz ? 'block' : 'none';
        
        if (includeQuiz && quizQuestions.length === 0) {
            addQuizQuestion();
        }
    }

    window.addQuizQuestion = function() {
        const questionId = Date.now();
        const questionNumber = document.querySelectorAll('.quiz-question').length + 1;
        
        const questionHtml = `
            <div class="quiz-question" data-question-id="${questionId}" style="background: #f5f5f5; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
                <h4>Question ${questionNumber}</h4>
                <input type="text" placeholder="Enter your question" id="question_${questionId}" class="form-control mb-3" style="width: 100%; padding: 10px; margin-bottom: 15px;">
                
                <div class="form-group">
                    <label>Question Type</label>
                    <select id="questionType_${questionId}" onchange="updateQuestionOptions(${questionId})" class="form-control" style="width: 100%; padding: 8px;">
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="true-false">True/False</option>
                    </select>
                </div>
                
                <div id="options_${questionId}" class="options-container" style="margin: 15px 0;">
                    <div class="option-item" style="display: flex; align-items: center; margin-bottom: 10px;">
                        <input type="text" placeholder="Option 1" class="option-text" style="flex: 1; padding: 8px; margin-right: 10px;">
                        <label style="margin: 0;"><input type="radio" name="correct_${questionId}" value="0"> Correct</label>
                    </div>
                    <div class="option-item" style="display: flex; align-items: center; margin-bottom: 10px;">
                        <input type="text" placeholder="Option 2" class="option-text" style="flex: 1; padding: 8px; margin-right: 10px;">
                        <label style="margin: 0;"><input type="radio" name="correct_${questionId}" value="1"> Correct</label>
                    </div>
                    <div class="option-item" style="display: flex; align-items: center; margin-bottom: 10px;">
                        <input type="text" placeholder="Option 3" class="option-text" style="flex: 1; padding: 8px; margin-right: 10px;">
                        <label style="margin: 0;"><input type="radio" name="correct_${questionId}" value="2"> Correct</label>
                    </div>
                    <div class="option-item" style="display: flex; align-items: center; margin-bottom: 10px;">
                        <input type="text" placeholder="Option 4" class="option-text" style="flex: 1; padding: 8px; margin-right: 10px;">
                        <label style="margin: 0;"><input type="radio" name="correct_${questionId}" value="3"> Correct</label>
                    </div>
                </div>
                
                <div class="form-group mt-3">
                    <label>Points</label>
                    <input type="number" id="points_${questionId}" value="10" min="1" max="100" class="form-control" style="width: 100px; padding: 8px;">
                </div>
                
                <button type="button" class="btn-danger mt-3" onclick="removeQuestion(${questionId})">Remove Question</button>
                <hr>
            </div>
        `;
        
        const container = document.getElementById('quizBuilder');
        const addButton = container.querySelector('button');
        container.insertBefore(createElementFromHTML(questionHtml), addButton);
        
        quizQuestions.push(questionId);
    }

    function createElementFromHTML(htmlString) {
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();
        return div.firstChild;
    }

    window.updateQuestionOptions = function(questionId) {
        const type = document.getElementById(`questionType_${questionId}`).value;
        const optionsContainer = document.getElementById(`options_${questionId}`);
        
        if (type === 'true-false') {
            optionsContainer.innerHTML = `
                <div class="option-item" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span style="flex: 1;">True</span>
                    <label style="margin: 0;"><input type="radio" name="correct_${questionId}" value="0" checked> Correct</label>
                </div>
                <div class="option-item" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span style="flex: 1;">False</span>
                    <label style="margin: 0;"><input type="radio" name="correct_${questionId}" value="1"> Correct</label>
                </div>
            `;
        }
    }

    window.removeQuestion = function(questionId) {
        document.querySelector(`[data-question-id="${questionId}"]`).remove();
        quizQuestions = quizQuestions.filter(id => id !== questionId);
        
        // Renumber remaining questions
        document.querySelectorAll('.quiz-question h4').forEach((heading, index) => {
            heading.textContent = `Question ${index + 1}`;
        });
    }

    // Remove required attribute from hidden elements
    function removeRequiredFromHiddenElements() {
        // Remove required from video URL if not visible
        if (currentContentType !== 'video' && currentContentType !== 'mixed') {
            const videoUrl = document.getElementById('videoUrl');
            if (videoUrl) videoUrl.removeAttribute('required');
        }
        
        // Remove required from hidden quiz questions
        if (!document.getElementById('includeQuiz').checked) {
            document.querySelectorAll('#quizBuilder input[required]').forEach(input => {
                input.removeAttribute('required');
            });
        }
        
        // Remove required from resource fields that are empty
        document.querySelectorAll('.resource-item').forEach(item => {
            const titleInput = item.querySelector('input[type="text"]');
            const urlInput = item.querySelector('input[type="url"]');
            
            if (!titleInput.value && !urlInput.value) {
                titleInput.removeAttribute('required');
                urlInput.removeAttribute('required');
            }
        });
    }

    // Validate form before submission
    function validateForm() {
        // Check main required fields
        const requiredFields = [
            { id: 'moduleTitle', message: 'Please enter a module title' },
            { id: 'moduleDescription', message: 'Please enter a module description' },
            { id: 'moduleCategory', message: 'Please select a category' },
            { id: 'moduleDifficulty', message: 'Please select difficulty level' },
            { id: 'moduleDuration', message: 'Please enter module duration' }
        ];
        
        for (const field of requiredFields) {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                alert(field.message);
                if (element) element.focus();
                return false;
            }
        }
        
        // Check content
        const contentEditor = document.getElementById('contentEditor');
        if (!contentEditor.innerHTML.trim() || contentEditor.innerHTML === '<p>Start typing your module content here...</p>') {
            alert('Please add some content to your module');
            contentEditor.focus();
            return false;
        }
        
        // Validate video URL if video type is selected
        if ((currentContentType === 'video' || currentContentType === 'mixed')) {
            const videoUrl = document.getElementById('videoUrl');
            if (videoUrl && !videoUrl.value.trim()) {
                alert('Please enter a video URL for video content');
                videoUrl.focus();
                return false;
            }
        }
        
        // Validate quiz if enabled
        if (document.getElementById('includeQuiz').checked) {
            const hasValidQuestions = quizQuestions.some(questionId => {
                const questionText = document.getElementById(`question_${questionId}`)?.value;
                return questionText && questionText.trim();
            });
            
            if (!hasValidQuestions) {
                alert('Please add at least one quiz question');
                return false;
            }
        }
        
        return true;
    }

    // Form submission
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('createModuleForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                console.log('Form submitted');
                
                // Remove required from hidden elements before validation
                removeRequiredFromHiddenElements();
                
                // Validate visible required fields
                if (!validateForm()) {
                    return;
                }
                
                // Disable submit button
                const submitBtn = e.target.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating Module...';
                
                try {
                    // Gather form data
                    const moduleData = {
                        title: document.getElementById('moduleTitle').value,
                        description: document.getElementById('moduleDescription').value,
                        category: document.getElementById('moduleCategory').value,
                        difficulty: document.getElementById('moduleDifficulty').value,
                        duration: parseInt(document.getElementById('moduleDuration').value),
                        tags: [], // You can add a tag input system later
                        content: {
                            type: currentContentType,
                            body: document.getElementById('contentEditor').innerHTML || '<p>No content provided</p>',
                            videoUrl: currentContentType === 'video' || currentContentType === 'mixed' 
                                ? (document.getElementById('videoUrl')?.value || '') 
                                : '',
                            resources: gatherResources()
                        }
                    };
                    
                    console.log('Module data:', moduleData);
                    
                    // Create module
                    const response = await fetch(`${MODULE_API_URL}/education/modules`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify(moduleData)
                    });
                    
                    console.log('Response status:', response.status);
                    
                    const responseData = await response.json();
                    console.log('Response data:', responseData);
                    
                    if (!response.ok) {
                        throw new Error(responseData.error || 'Failed to create module');
                    }
                    
                    const { module } = responseData;
                    
                    // Create quiz if enabled
                    if (document.getElementById('includeQuiz').checked && quizQuestions.length > 0) {
                        console.log('Creating quiz...');
                        const quizData = gatherQuizData();
                        
                        // Validate quiz data
                        if (quizData.questions.length === 0) {
                            console.warn('No valid quiz questions found');
                        } else {
                            const quizResponse = await fetch(`${MODULE_API_URL}/education/modules/${module._id}/quiz`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: JSON.stringify(quizData)
                            });
                            
                            if (!quizResponse.ok) {
                                console.error('Failed to create quiz:', await quizResponse.text());
                            }
                        }
                    }
                    
                    alert('Module created successfully!');
                    window.location.href = 'education-library.html';
                    
                } catch (error) {
                    console.error('Error creating module:', error);
                    alert('Failed to create module: ' + error.message);
                    
                    // Re-enable submit button
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Module';
                }
            });
        }
    });

    function gatherResources() {
        const resourcesList = [];
        document.querySelectorAll('.resource-item').forEach(item => {
            const id = item.dataset.resourceId;
            const title = document.getElementById(`resourceTitle_${id}`)?.value;
            const url = document.getElementById(`resourceUrl_${id}`)?.value;
            const type = document.getElementById(`resourceType_${id}`)?.value;
            
            if (title && url) {
                resourcesList.push({ title, url, type });
            }
        });
        return resourcesList;
    }

    function gatherQuizData() {
        const questions = [];
        
        quizQuestions.forEach(questionId => {
            const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
            if (!questionElement) return;
            
            const questionText = document.getElementById(`question_${questionId}`)?.value;
            const questionType = document.getElementById(`questionType_${questionId}`)?.value;
            const points = parseInt(document.getElementById(`points_${questionId}`)?.value) || 10;
            
            const options = [];
            const correctIndex = document.querySelector(`input[name="correct_${questionId}"]:checked`)?.value;
            
            if (questionType === 'multiple-choice') {
                questionElement.querySelectorAll('.option-text').forEach((input, index) => {
                    if (input.value) {
                        options.push({
                            text: input.value,
                            isCorrect: index == correctIndex
                        });
                    }
                });
            } else {
                options.push({ text: 'True', isCorrect: correctIndex == '0' });
                options.push({ text: 'False', isCorrect: correctIndex == '1' });
            }
            
            if (questionText && options.length > 0) {
                questions.push({
                    text: questionText,
                    type: questionType,
                    options,
                    points
                });
            }
        });
        
        return {
            title: document.getElementById('moduleTitle').value + ' Quiz',
            questions,
            passingScore: 70 // You can make this configurable
        };
    }

    // Preview functionality
    window.previewModule = function() {
        const moduleData = {
            title: document.getElementById('moduleTitle').value || 'Untitled Module',
            description: document.getElementById('moduleDescription').value || 'No description',
            content: document.getElementById('contentEditor').innerHTML || '<p>No content</p>',
            difficulty: document.getElementById('moduleDifficulty').value,
            duration: document.getElementById('moduleDuration').value
        };
        
        // Create preview modal
        const previewHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; width: 80%; max-height: 80%; overflow-y: auto; padding: 30px; border-radius: 10px;">
                    <h2>${moduleData.title}</h2>
                    <p style="color: #666;">${moduleData.description}</p>
                    <div style="margin: 20px 0;">
                        <span style="background: #f0f0f0; padding: 5px 10px; border-radius: 5px; margin-right: 10px;">
                            📊 ${moduleData.difficulty}
                        </span>
                        <span style="background: #f0f0f0; padding: 5px 10px; border-radius: 5px;">
                            ⏱️ ${moduleData.duration} minutes
                        </span>
                    </div>
                    <hr>
                    <div style="margin: 20px 0;">
                        ${moduleData.content}
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        Close Preview
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', previewHTML);
    }

    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', () => {
        // Add at least one resource field by default
        if (document.getElementById('resourcesContainer') && resources.length === 0) {
            // Don't add by default to avoid validation issues
            // addResource();
        }
        
        // Rich text editor basic formatting
        const editor = document.getElementById('contentEditor');
        if (editor) {
            // Enable basic formatting
            editor.addEventListener('keydown', function(e) {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    document.execCommand('insertText', false, '\t');
                }
            });
            
            // Add some default content
            if (editor.innerHTML.trim() === '') {
                editor.innerHTML = '<p>Start typing your module content here...</p>';
            }
            
            // Clear placeholder on focus
            editor.addEventListener('focus', function() {
                if (this.innerHTML === '<p>Start typing your module content here...</p>') {
                    this.innerHTML = '';
                }
            });
            
            // Add placeholder on blur if empty
            editor.addEventListener('blur', function() {
                if (this.innerHTML.trim() === '') {
                    this.innerHTML = '<p>Start typing your module content here...</p>';
                }
            });
        }
    });

})(); // End of IIFE
