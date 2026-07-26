// frontend/js/analytics/charts.js

// Survey Impact Chart Functions
function displayImpactMetrics(data) {
    const impactSection = document.getElementById('survey-impact-section');
    if (!impactSection) return;
    
    // Create metrics display
    const metricsHTML = `
        <div class="impact-metrics-grid">
            <div class="impact-metric">
                <h4>Overall Impact</h4>
                <div class="impact-value ${data.overallChange > 0 ? 'positive' : 'negative'}">
                    ${data.overallChange > 0 ? '+' : ''}${data.overallChange}%
                </div>
            </div>
            <div class="impact-metric">
                <h4>Participation Rate</h4>
                <div class="impact-value">
                    ${data.participationRate.retention}%
                </div>
                <span class="metric-subtitle">
                    ${data.participationRate.before} → ${data.participationRate.after} responses
                </span>
            </div>
        </div>
        
        <div class="findings-section">
            <h4>Key Findings</h4>
            <ul class="findings-list">
                ${data.significantFindings.map(finding => `
                    <li class="${finding.change > 0 ? 'positive' : 'negative'}">
                        ${finding.message} (${finding.change > 0 ? '+' : ''}${finding.change}%)
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
    
    // Insert before charts
    const chartsGrid = impactSection.querySelector('.charts-grid');
    const metricsDiv = document.createElement('div');
    metricsDiv.className = 'impact-metrics-container';
    metricsDiv.innerHTML = metricsHTML;
    impactSection.insertBefore(metricsDiv, chartsGrid);
}

function createImpactCharts(data) {
    // Before/After Comparison Chart
    const comparisonCtx = document.getElementById('impact-comparison-chart');
    if (comparisonCtx) {
        new Chart(comparisonCtx.getContext('2d'), {
            type: 'radar',
            data: {
                labels: ['Awareness', 'Behavior', 'Attitude', 'Knowledge'],
                datasets: [{
                    label: 'Before Campaign',
                    data: [
                        data.categoryChanges.awareness?.preAverage || 0,
                        data.categoryChanges.behavior?.preAverage || 0,
                        data.categoryChanges.attitude?.preAverage || 0,
                        data.categoryChanges.knowledge?.preAverage || 0
                    ],
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2
                }, {
                    label: 'After Campaign',
                    data: [
                        data.categoryChanges.awareness?.postAverage || 0,
                        data.categoryChanges.behavior?.postAverage || 0,
                        data.categoryChanges.attitude?.postAverage || 0,
                        data.categoryChanges.knowledge?.postAverage || 0
                    ],
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 10,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#fff'
                        }
                    }
                }
            }
        });
    }
    
    // Change Percentage Chart
    const changeCtx = document.getElementById('change-percentage-chart');
    if (changeCtx) {
        const categories = Object.keys(data.categoryChanges);
        const changes = categories.map(cat => data.categoryChanges[cat]?.percentageChange || 0);
        const colors = changes.map(change => change > 0 ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)');
        
        new Chart(changeCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
                datasets: [{
                    label: 'Percentage Change',
                    data: changes,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#fff',
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#fff'
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y > 0 
                                    ? '+' + context.parsed.y + '%' 
                                    : context.parsed.y + '%';
                            }
                        }
                    }
                }
            }
        });
    }
}

// Export functions
window.chartFunctions = {
    displayImpactMetrics,
    createImpactCharts
};
