// backend/services/sentimentAnalysis.js
const Sentiment = require('sentiment');

class SentimentAnalyzer {
    constructor() {
        this.analyzer = new Sentiment();
        
        // Add custom words to improve accuracy
        this.customWords = {
            // Positive words
            'excellent': 5,
            'amazing': 5,
            'wonderful': 4,
            'fantastic': 5,
            'brilliant': 5,
            'awesome': 4,
            'great': 3,
            'good': 2,
            'nice': 2,
            'helpful': 3,
            'useful': 3,
            'love': 4,
            'loved': 4,
            'loving': 4,
            'best': 5,
            'perfect': 5,
            'beautiful': 4,
            'excellent': 5,
            'outstanding': 5,
            'incredible': 5,
            'superb': 5,
            'magnificent': 5,
            'marvelous': 4,
            'splendid': 4,
            'remarkable': 4,
            'exceptional': 5,
            'fabulous': 4,
            'terrific': 4,
            'super': 3,
            'very good': 4,
            'very nice': 3,
            'really good': 4,
            'really great': 4,
            
            // Negative words
            'terrible': -5,
            'horrible': -5,
            'awful': -5,
            'bad': -3,
            'poor': -3,
            'worst': -5,
            'hate': -4,
            'hated': -4,
            'useless': -4,
            'pathetic': -4,
            'disgusting': -5,
            'disappointing': -3,
            'disappointed': -3,
            'frustrating': -3,
            'frustrated': -3,
            'annoying': -3,
            'annoyed': -3,
            'waste': -3,
            'garbage': -4,
            'trash': -4,
            'stupid': -4,
            'dumb': -4,
            'idiotic': -4,
            'ridiculous': -3,
            'unacceptable': -4,
            'incompetent': -4,
            
            // Intensifiers (will multiply the next word's score)
            'very': 0,
            'really': 0,
            'extremely': 0,
            'absolutely': 0,
            'completely': 0,
            'totally': 0,
            'utterly': 0,
            'quite': 0,
            'rather': 0
        };
    }

    analyzeText(text) {
        if (!text || text.trim().length === 0) {
            return {
                label: 'neutral',
                score: 50,
                keywords: []
            };
        }

        // Convert to lowercase for analysis
        const lowerText = text.toLowerCase();
        
        // Check for intensifiers + positive/negative patterns
        const intensifierPattern = /\b(very|really|extremely|absolutely|completely|totally|utterly|quite|rather)\s+(\w+)/gi;
        let modifiedText = lowerText;
        
        const matches = [...lowerText.matchAll(intensifierPattern)];
        matches.forEach(match => {
            const intensifier = match[1];
            const word = match[2];
            
            // If the word after intensifier is positive/negative, boost it
            if (this.customWords[word]) {
                const boostedScore = this.customWords[word] * 1.5;
                this.customWords[`${intensifier} ${word}`] = boostedScore;
            }
        });

        // Analyze with custom words
        const result = this.analyzer.analyze(text, this.customWords);
        
        // Calculate normalized score (0-100)
        let normalizedScore;
        let label;
        
        // More nuanced scoring based on comparative score
        const comparativeScore = result.comparative;
        
        if (comparativeScore >= 0.5) {
            label = 'positive';
            // Scale from 70-95 for positive sentiments
            normalizedScore = Math.min(70 + (comparativeScore * 25), 95);
        } else if (comparativeScore <= -0.5) {
            label = 'negative';
            // Scale from 5-30 for negative sentiments
            normalizedScore = Math.max(30 + (comparativeScore * 25), 5);
        } else {
            // For scores between -0.5 and 0.5
            if (comparativeScore > 0.1) {
                label = 'positive';
                normalizedScore = 50 + (comparativeScore * 40);
            } else if (comparativeScore < -0.1) {
                label = 'negative';
                normalizedScore = 50 + (comparativeScore * 40);
            } else {
                label = 'neutral';
                normalizedScore = 50 + (comparativeScore * 20);
            }
        }

        // Round the score
        normalizedScore = Math.round(normalizedScore);

        // Extract keywords (positive and negative words found)
        const keywords = [...result.positive, ...result.negative];
        
        // Also check for emojis which can indicate sentiment
        const positiveEmojis = ['😊', '😄', '😃', '😍', '🥰', '👍', '❤️', '💕', '✨', '🎉', '🙌', '👏'];
        const negativeEmojis = ['😢', '😞', '😔', '😠', '😡', '👎', '💔', '😤', '😒', '🙄'];
        
        const hasPositiveEmoji = positiveEmojis.some(emoji => text.includes(emoji));
        const hasNegativeEmoji = negativeEmojis.some(emoji => text.includes(emoji));
        
        if (hasPositiveEmoji && label !== 'negative') {
            label = 'positive';
            normalizedScore = Math.min(normalizedScore + 10, 95);
        } else if (hasNegativeEmoji && label !== 'positive') {
            label = 'negative';
            normalizedScore = Math.max(normalizedScore - 10, 5);
        }

        console.log(`Sentiment Analysis - Text: "${text}" | Score: ${result.score} | Comparative: ${comparativeScore} | Label: ${label}`);

        return {
            label,
            score: normalizedScore,
            keywords,
            details: {
                rawScore: result.score,
                comparative: result.comparative,
                positive: result.positive,
                negative: result.negative,
                tokens: result.tokens.length
            }
        };
    }

    // Batch analyze multiple texts (for post overall sentiment)
    analyzeMultiple(texts) {
        const analyses = texts.map(text => this.analyzeText(text));
        
        const totals = analyses.reduce((acc, analysis) => {
            acc[analysis.label] = (acc[analysis.label] || 0) + 1;
            acc.totalScore += analysis.score;
            return acc;
        }, { positive: 0, negative: 0, neutral: 0, totalScore: 0 });

        const dominantSentiment = Object.keys(totals)
            .filter(key => key !== 'totalScore')
            .reduce((a, b) => totals[a] > totals[b] ? a : b);

        const averageScore = Math.round(totals.totalScore / analyses.length);

        return {
            overall: dominantSentiment,
            averageScore,
            distribution: {
                positive: totals.positive,
                negative: totals.negative,
                neutral: totals.neutral
            }
        };
    }
}

// Create singleton instance
const sentimentAnalyzer = new SentimentAnalyzer();

module.exports = sentimentAnalyzer;
