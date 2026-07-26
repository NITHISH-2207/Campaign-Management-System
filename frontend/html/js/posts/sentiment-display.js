// frontend/js/posts/sentiment-display.js
class SentimentDisplay {
    constructor() {
        this.sentimentColors = {
            positive: '#4CAF50',
            negative: '#f44336',
            neutral: '#9E9E9E',
            mixed: '#FF9800'
        };
    }

    createSentimentChart(containerId, sentimentData) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { positive, negative, neutral } = sentimentData.scores;
        const total = positive + negative + neutral;

        if (total === 0) {
            container.innerHTML = '<p class="no-sentiment">No sentiment data available yet</p>';
            return;
        }

        const percentages = {
            positive: Math.round((positive / total) * 100),
            negative: Math.round((negative / total) * 100),
            neutral: Math.round((neutral / total) * 100)
        };

        const chartHTML = `
            <div class="sentiment-chart">
                <div class="sentiment-bar">
                    <div class="sentiment-segment positive" style="width: ${percentages.positive}%; background: ${this.sentimentColors.positive}"></div>
                    <div class="sentiment-segment neutral" style="width: ${percentages.neutral}%; background: ${this.sentimentColors.neutral}"></div>
                    <div class="sentiment-segment negative" style="width: ${percentages.negative}%; background: ${this.sentimentColors.negative}"></div>
                </div>
                <div class="sentiment-legend">
                    <div class="legend-item">
                        <span class="legend-color" style="background: ${this.sentimentColors.positive}"></span>
                        <span>Positive: ${percentages.positive}%</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: ${this.sentimentColors.neutral}"></span>
                        <span>Neutral: ${percentages.neutral}%</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: ${this.sentimentColors.negative}"></span>
                        <span>Negative: ${percentages.negative}%</span>
                    </div>
                </div>
                <div class="sentiment-summary">
                    <strong>Overall Sentiment:</strong> ${this.getOverallSentimentDisplay(sentimentData.overall)}
                </div>
            </div>
        `;

        container.innerHTML = chartHTML;
    }

    getOverallSentimentDisplay(overall) {
        const displays = {
            positive: '😊 Positive',
            negative: '😢 Negative',
            neutral: '😐 Neutral',
            mixed: '🤔 Mixed'
        };
        return displays[overall] || displays.neutral;
    }

    updatePostSentiment(postId, sentimentData) {
        const sentimentSection = document.querySelector(`#post-${postId} .post-sentiment`);
        if (sentimentSection) {
            this.createSentimentChart(`sentiment-chart-${postId}`, sentimentData);
        }
    }
}

// Global sentiment display instance
const sentimentDisplay = new SentimentDisplay();

// Helper function to get sentiment emoji (also used in other files)
function getSentimentEmoji(sentiment) {
    const emojis = {
        positive: '😊',
        negative: '😢',
        neutral: '😐',
        mixed: '🤔'
    };
    return emojis[sentiment] || emojis.neutral;
}
