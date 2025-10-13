// Wrap in IIFE to avoid global conflicts
(function() {
    // Use a different variable name to avoid conflicts
    const EDU_API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:3000/api';
    let currentUser = null;
    let allModules = [];

    // Initialize
    document.addEventListener('DOMContentLoaded', async () => {
        currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!currentUser.id) {
            window.location.href = 'login.html';
            return;
        }
        
        // Update UI
        const userMenu = document.getElementById('userMenu');
        if (userMenu && currentUser.name) {
            userMenu.textContent = `Hi, ${currentUser.name}`;
        }
        
        // Add create module button for campaign managers
        if (['campaign_manager', 'admin'].includes(currentUser.role)) {
            addCreateModuleButton();
        }
        
        // Load modules and progress
        await Promise.all([
            loadModules(),
            loadUserProgress()
        ]);
    });

    function addCreateModuleButton() {
        const header = document.querySelector('.education-header');
        const button = document.createElement('a');
        button.href = 'create-education-module.html';
        button.className = 'btn btn-primary';
        button.style.marginTop = '20px';
        button.textContent = '+ Create New Module';
        header.appendChild(button);
    }

    async function loadModules() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const errorMessage = document.getElementById('errorMessage');
        const grid = document.getElementById('modulesGrid');
        
        try {
            // Show loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (errorMessage) errorMessage.style.display = 'none';
            grid.innerHTML = '';
            
            console.log('Loading modules from:', `${EDU_API_URL}/education/modules`);
            console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
            
            const response = await fetch(`${EDU_API_URL}/education/modules`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            console.log('Response status:', response.status);
            
            // Get the raw text first to see what's coming back
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            // Try to parse as JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response as JSON:', e);
                throw new Error('Invalid response format');
            }
            
            console.log('Parsed data:', data);
            
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            // Check different possible response formats
            if (data.success && data.modules) {
                allModules = data.modules;
                displayModules(allModules);
            } else if (data.modules) {
                allModules = data.modules;
                displayModules(allModules);
            } else if (Array.isArray(data)) {
                allModules = data;
                displayModules(allModules);
            } else {
                console.log('Unexpected data format:', data);
                displayModules([]);
            }
            
        } catch (error) {
            console.error('Error loading modules:', error);
            
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            // Show error message
            if (errorMessage) {
                errorMessage.style.display = 'block';
                errorMessage.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #e74c3c;">
                        <h3>Failed to load modules</h3>
                        <p>${error.message}</p>
                        <button onclick="loadModules()" style="margin-top: 10px;">Try Again</button>
                    </div>
                `;
            }
            
            // Show empty state
            displayModules([]);
        }
    }

    async function loadUserProgress() {
        try {
            const response = await fetch(`${EDU_API_URL}/education/user-progress`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            console.log('User progress response:', response.status);
            
            if (!response.ok) {
                console.error('Failed to load progress:', await response.text());
                return;
            }
            
            const { stats } = await response.json();
            
            // Update progress display
            document.getElementById('modulesCompleted').textContent = stats.modulesCompleted || '0';
            document.getElementById('quizzesPassed').textContent = stats.quizzesPassed || '0';
            document.getElementById('certificatesEarned').textContent = Math.floor(stats.modulesCompleted / 3) || '0';
            
        } catch (error) {
            console.error('Error loading progress:', error);
        }
    }

    function displayModules(modules) {
        const grid = document.getElementById('modulesGrid');
        
        console.log('Displaying modules:', modules);
        
        // Clear any existing content
        grid.innerHTML = '';
        
        if (!modules || modules.length === 0) {
            grid.innerHTML = `
                <div class="no-modules" style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: #f8f9fa; border-radius: 10px;">
                    <h3 style="color: #666; margin-bottom: 20px;">No modules available yet</h3>
                    ${currentUser && currentUser.role === 'campaign_manager' ? 
                        '<p style="color: #888;">Click the "Create New Module" button above to add your first educational module!</p>' :
                        '<p style="color: #888;">Check back soon for new educational content!</p>'
                    }
                    ${currentUser && currentUser.role === 'campaign_manager' ? 
                        '<a href="create-education-module.html" class="btn btn-primary" style="display: inline-block; margin-top: 20px;">Create Your First Module</a>' : 
                        ''
                    }
                </div>
            `;
            return;
        }
        
        // Display the modules
        modules.forEach(module => {
            const moduleCard = document.createElement('div');
            moduleCard.innerHTML = createModuleCard(module);
            grid.appendChild(moduleCard.firstElementChild);
        });
    }

    function createModuleCard(module) {
        const progress = module.userProgress;
        const isCreator = module.isCreator;
        const canStart = !isCreator || currentUser.role === 'admin';
        
        return `
            <div class="module-card" data-category="${module.category}" data-module-id="${module._id}">
                <div class="module-image">
                    <img src="../assets/images/${module.category}-module.jpg" 
                         alt="${module.title}" 
                         onerror="this.src='https://via.placeholder.com/300x200?text=${encodeURIComponent(module.title)}'">
                    ${new Date(module.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? '<div class="module-badge">New</div>' : ''}
                    ${isCreator ? '<div class="module-badge creator">Your Module</div>' : ''}
                </div>
                <div class="module-content">
                    <h3>${module.title}</h3>
                    <p>${module.description}</p>
                    <div class="module-meta">
                        <span class="duration">⏱️ ${module.duration} min</span>
                        <span class="difficulty">📊 ${capitalizeFirst(module.difficulty)}</span>
                        <span class="completions">👥 ${module.completions} completed</span>
                    </div>
                    ${progress ? `
                        <div class="module-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress.progressPercentage}%"></div>
                            </div>
                            <span class="progress-text">${progress.progressPercentage}% Complete</span>
                        </div>
                    ` : canStart ? `
                        <div class="module-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 0%"></div>
                            </div>
                            <span class="progress-text">Not started</span>
                        </div>
                    ` : ''}
                    
                    ${isCreator && currentUser.role === 'campaign_manager' ? `
                        <div class="module-actions">
                            <button class="view-stats-btn" onclick="viewModuleStats('${module._id}')">
                                📊 View Stats
                            </button>
                            <button class="edit-module-btn" onclick="editModule('${module._id}')">
                                ✏️ Edit
                            </button>
                        </div>
                    ` : canStart ? `
                        <button class="start-module-btn" onclick="startModule('${module._id}')">
                            ${progress ? 'Continue Learning' : 'Start Learning'}
                        </button>
                    ` : `
                        <div class="creator-notice">You cannot participate in modules you created</div>
                    `}
                </div>
            </div>
        `;
    }

    async function startModule(moduleId) {
        try {
            // Start or continue module
            const response = await fetch(`${EDU_API_URL}/education/modules/${moduleId}/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start module');
            }
            
            // Open module viewer
            openModuleViewer(moduleId);
            
        } catch (error) {
            console.error('Error starting module:', error);
            alert(error.message);
        }
    }

    async function openModuleViewer(moduleId) {
        try {
            const response = await fetch(`${EDU_API_URL}/education/modules/${moduleId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load module');
            
            const { module, canParticipate } = await response.json();
            
            const viewer = document.getElementById('moduleViewer');
            const content = document.getElementById('moduleContent');
            
            content.innerHTML = createModuleViewer(module, canParticipate);
            viewer.style.display = 'flex';
            
            // Initialize module interaction
            if (canParticipate) {
                initializeModuleInteraction(module);
            }
            
        } catch (error) {
            console.error('Error loading module:', error);
            alert('Failed to load module content');
        }
    }

    function createModuleViewer(module, canParticipate) {
        if (!canParticipate) {
            return `
                <div class="module-viewer-content">
                    <h2>${module.title}</h2>
                    <div class="alert alert-info">
                        <h3>Preview Mode</h3>
                        <p>As the creator of this module, you can preview but not participate in it.</p>
                    </div>
                    <div class="module-body">
                        ${module.content.body}
                    </div>
                    ${module.content.resources?.length > 0 ? `
                        <div class="module-resources">
                            <h3>Additional Resources</h3>
                            ${module.content.resources.map(r => `
                                <a href="${r.url}" target="_blank" class="resource-link">
                                    📎 ${r.title}
                                </a>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        return `
            <div class="module-viewer-content">
                <div class="module-header">
                    <h2>${module.title}</h2>
                    <div class="module-nav">
                        <button onclick="previousSection()" id="prevBtn" disabled>Previous</button>
                        <span id="sectionIndicator">Section 1 of 1</span>
                        <button onclick="nextSection()" id="nextBtn">Next</button>
                    </div>
                </div>
                
                <div class="module-body" id="moduleBody">
                    ${module.content.body}
                </div>
                
                ${module.content.videoUrl ? `
                    <div class="module-video">
                        <iframe src="${module.content.videoUrl}" 
                                frameborder="0" 
                                allowfullscreen></iframe>
                    </div>
                ` : ''}
                
                ${module.content.resources?.length > 0 ? `
                    <div class="module-resources">
                        <h3>Additional Resources</h3>
                        ${module.content.resources.map(r => `
                            <a href="${r.url}" target="_blank" class="resource-link">
                                📎 ${r.title}
                            </a>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="module-actions">
                    <button id="completeBtn" onclick="completeModule('${module._id}')" class="btn-success">
                        Complete Module
                    </button>
                    <button id="takeQuizBtn" onclick="takeQuiz('${module._id}')" class="btn-primary" style="display: none;">
                        Take Quiz
                    </button>
                </div>
                
                <div class="progress-tracker">
                    <div class="time-spent">Time spent: <span id="timeSpent">0:00</span></div>
                    <div class="progress-indicator">
                        Progress: <span id="progressPercent">0</span>%
                    </div>
                </div>
            </div>
        `;
    }

    let moduleTimer;
    let timeSpent = 0;

    function initializeModuleInteraction(module) {
        // Start timer
        moduleTimer = setInterval(() => {
            timeSpent++;
            const minutes = Math.floor(timeSpent / 60);
            const seconds = timeSpent % 60;
            document.getElementById('timeSpent').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
        
        // Track scroll progress
        const moduleBody = document.getElementById('moduleBody');
        moduleBody.addEventListener('scroll', updateProgress);
    }

    function updateProgress() {
        const moduleBody = document.getElementById('moduleBody');
        const scrollPercent = (moduleBody.scrollTop / (moduleBody.scrollHeight - moduleBody.clientHeight)) * 100;
        document.getElementById('progressPercent').textContent = Math.round(scrollPercent);
    }

    async function completeModule(moduleId) {
        try {
            clearInterval(moduleTimer);
            
            const response = await fetch(`${EDU_API_URL}/education/modules/${moduleId}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to complete module');
            
            const result = await response.json();
            
            // Check if quiz is available
            const quizResponse = await fetch(`${EDU_API_URL}/education/modules/${moduleId}/quiz`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (quizResponse.ok) {
                document.getElementById('completeBtn').style.display = 'none';
                document.getElementById('takeQuizBtn').style.display = 'block';
            } else {
                alert('Congratulations! You have completed this module.');
                closeModule();
                loadModules(); // Refresh to show updated progress
            }
            
        } catch (error) {
            console.error('Error completing module:', error);
            alert('Failed to complete module');
        }
    }

    async function takeQuiz(moduleId) {
        try {
            const response = await fetch(`${EDU_API_URL}/education/modules/${moduleId}/quiz`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load quiz');
            
            const { quiz } = await response.json();
            showQuiz(quiz);
            
        } catch (error) {
            console.error('Error loading quiz:', error);
            alert('Failed to load quiz');
        }
    }

    function showQuiz(quiz) {
        const content = document.getElementById('moduleContent');
        content.innerHTML = createQuizHTML(quiz);
    }

    function createQuizHTML(quiz) {
        return `
            <div class="quiz-container">
                <h2>${quiz.title}</h2>
                <p>You need ${quiz.passingScore}% to pass this quiz.</p>
                
                <form id="quizForm" onsubmit="submitQuiz(event, '${quiz._id}')">
                    ${quiz.questions.map((q, index) => `
                        <div class="quiz-question">
                            <h4>Question ${index + 1} (${q.points} points)</h4>
                            <p>${q.text}</p>
                            
                            ${q.type === 'multiple-choice' ? `
                                ${q.options.map((opt, optIndex) => `
                                    <label class="quiz-option">
                                        <input type="radio" name="q${index}" value="${opt.text}" required>
                                        ${opt.text}
                                    </label>
                                `).join('')}
                            ` : `
                                <label class="quiz-option">
                                    <input type="radio" name="q${index}" value="True" required>
                                    True
                                </label>
                                <label class="quiz-option">
                                    <input type="radio" name="q${index}" value="False" required>
                                    False
                                </label>
                            `}
                        </div>
                    `).join('')}
                    
                    <button type="submit" class="btn-primary">Submit Quiz</button>
                </form>
            </div>
        `;
    }

    async function submitQuiz(event, quizId) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const answers = [];
        
        // Collect answers
        let questionIndex = 0;
        for (let [key, value] of formData.entries()) {
            answers[questionIndex] = value;
            questionIndex++;
        }
        
        try {
            const response = await fetch(`${EDU_API_URL}/education/quiz/${quizId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ answers })
            });
            
            if (!response.ok) throw new Error('Failed to submit quiz');
            
            const result = await response.json();
            showQuizResult(result);
            
        } catch (error) {
            console.error('Error submitting quiz:', error);
            alert('Failed to submit quiz');
        }
    }

    function showQuizResult(result) {
        const content = document.getElementById('moduleContent');
        content.innerHTML = `
            <div class="quiz-result">
                <h2>${result.passed ? '🎉 Congratulations!' : '📚 Keep Learning!'}</h2>
                <div class="score-display">
                    <div class="score-circle ${result.passed ? 'passed' : 'failed'}">
                        ${result.score}%
                    </div>
                </div>
                <p>${result.message}</p>
                <p>Passing score: ${result.passingScore}%</p>
                
                <div class="result-actions">
                    ${result.passed ? `
                        <button onclick="closeModule()" class="btn-success">Complete</button>
                    ` : `
                        <button onclick="retakeQuiz()" class="btn-primary">Retake Quiz</button>
                        <button onclick="closeModule()" class="btn-secondary">Review Module</button>
                    `}
                </div>
            </div>
        `;
        
        if (result.passed) {
            // Update stats
            const quizzesPassed = document.getElementById('quizzesPassed');
            quizzesPassed.textContent = parseInt(quizzesPassed.textContent) + 1;
        }
    }

    function closeModule() {
        document.getElementById('moduleViewer').style.display = 'none';
        clearInterval(moduleTimer);
        timeSpent = 0;
        loadModules(); // Refresh module list
        loadUserProgress(); // Update progress stats
    }

    async function viewModuleStats(moduleId) {
        try {
            const response = await fetch(`${EDU_API_URL}/education/modules/${moduleId}/stats`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load stats');
            
            const { stats } = await response.json();
            showModuleStats(stats);
            
        } catch (error) {
            console.error('Error loading stats:', error);
            alert('Failed to load module statistics');
        }
    }

    function showModuleStats(stats) {
        const viewer = document.getElementById('moduleViewer');
        const content = document.getElementById('moduleContent');
        
        content.innerHTML = `
            <div class="module-stats">
                <h2>Module Statistics</h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Total Views</h3>
                        <div class="stat-value">${stats.totalViews}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Completions</h3>
                        <div class="stat-value">${stats.completions}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Average Progress</h3>
                        <div class="stat-value">${Math.round(stats.averageProgress)}%</div>
                    </div>
                    <div class="stat-card">
                        <h3>Quiz Pass Rate</h3>
                        <div class="stat-value">${stats.quizAttempts > 0 ? Math.round((stats.averageQuizScore / 100) * 100) : 0}%</div>
                    </div>
                </div>
                
                <h3>Recent Activity</h3>
                <div class="activity-list">
                    ${stats.recentActivity.map(activity => `
                        <div class="activity-item">
                            <span>${activity.userId.name}</span>
                            <span>${activity.progressPercentage}% complete</span>
                            <span>${new Date(activity.lastAccessedAt).toLocaleDateString()}</span>
                        </div>
                    `).join('')}
                </div>
                
                <button onclick="closeModule()" class="btn-secondary">Close</button>
            </div>
        `;
        
        viewer.style.display = 'flex';
    }

    function editModule(moduleId) {
        window.location.href = `create-education-module.html?edit=${moduleId}`;
    }

    // Search and filter functions
    function searchModules() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filteredModules = allModules.filter(module => 
            module.title.toLowerCase().includes(searchTerm) ||
            module.description.toLowerCase().includes(searchTerm) ||
            module.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
        );
        
        displayModules(filteredModules);
    }

    function filterModules() {
        const category = document.getElementById('categoryFilter').value;
        let filteredModules = allModules;
        
        if (category) {
            filteredModules = allModules.filter(module => module.category === category);
        }
        
        displayModules(filteredModules);
    }

    // Utility functions
    function capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function showError(message) {
        const grid = document.getElementById('modulesGrid');
        grid.innerHTML = `<div class="error-message">${message}</div>`;
    }

    // Logout function
    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    // Make functions globally accessible for onclick handlers
    window.startModule = startModule;
    window.viewModuleStats = viewModuleStats;
    window.editModule = editModule;
    window.completeModule = completeModule;
    window.takeQuiz = takeQuiz;
    window.submitQuiz = submitQuiz;
    window.closeModule = closeModule;
    window.searchModules = searchModules;
    window.filterModules = filterModules;
    window.logout = logout;
    window.loadModules = loadModules; // For retry button
    window.retakeQuiz = function() {
        location.reload();
    };
    window.previousSection = function() {
        console.log('Previous section - implement navigation logic');
    };
    window.nextSection = function() {
        console.log('Next section - implement navigation logic');
    };

    // Debug function
    window.debugModules = async function() {
        console.log('=== DEBUG START ===');
        console.log('API_URL:', EDU_API_URL);
        console.log('Token:', localStorage.getItem('token'));
        console.log('User:', localStorage.getItem('user'));
        
        try {
            // Test the API directly
            const response = await fetch(`${EDU_API_URL}/education/modules`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            console.log('Response Status:', response.status);
            const text = await response.text();
            console.log('Response Text:', text);
            
            try {
                const json = JSON.parse(text);
                console.log('Parsed JSON:', json);
                
                // Check the modules
                if (json.modules) {
                    console.log('Modules found:', json.modules.length);
                    json.modules.forEach((m, i) => {
                        console.log(`Module ${i}:`, m);
                    });
                } else {
                    console.log('No modules property in response');
                }
            } catch (e) {
                console.error('JSON Parse Error:', e);
            }
        } catch (error) {
            console.error('Fetch Error:', error);
        }
        
        console.log('=== DEBUG END ===');
    };

})(); // End IIFE
