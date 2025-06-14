#!/usr/bin/env node

// Test script for auto-progression functionality
import { io as Client } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3001';

console.log('🧪 Testing Auto-Progression Functionality');
console.log('==========================================');

// Test configuration
const testGamePin = '123456';
const testPlayers = [
  { nickname: 'Player1', id: 'p1' },
  { nickname: 'Player2', id: 'p2' }
];

async function testAutoProgression() {
  try {
    console.log('1. Connecting mock players to test auto-progression...');
    
    // Create mock player connections
    const playerConnections = testPlayers.map(player => {
      const socket = Client(BACKEND_URL);
      socket.playerInfo = player;
      return socket;
    });

    // Simulate host connection
    const hostSocket = Client(BACKEND_URL);
    
    console.log('2. Setting up event listeners...');
    
    // Host events
    hostSocket.on('connect', () => {
      console.log('✅ Host connected');
    });

    hostSocket.on('game-started', (data) => {
      console.log('✅ Game started event received:', {
        questionNumber: data.questionNumber,
        totalQuestions: data.totalQuestions
      });
    });

    hostSocket.on('next-question', (data) => {
      console.log('✅ Next question event received:', {
        questionNumber: data.questionNumber,
        totalQuestions: data.totalQuestions
      });
    });

    hostSocket.on('score-updated', (data) => {
      console.log('💯 Score updated:', data.players?.length, 'players');
    });

    hostSocket.on('game-ended', (data) => {
      console.log('🏁 Game ended with final scores:', data.finalScores?.length, 'players');
      cleanup();
    });

    // Player events
    playerConnections.forEach((socket, index) => {
      socket.on('connect', () => {
        console.log(`✅ Player ${index + 1} connected`);
      });

      socket.on('game-started', (data) => {
        console.log(`🎮 Player ${index + 1} received first question`);
        
        // Simulate player answering after random delay
        setTimeout(() => {
          if (data.question?.answer_options?.[0]) {
            socket.emit('submit-answer', {
              answerId: data.question.answer_options[0].id,
              questionId: data.question.id,
              answerTime: Math.floor(Math.random() * 10) + 1,
              playerId: socket.playerInfo.id
            });
            console.log(`📝 Player ${index + 1} submitted answer`);
          }
        }, Math.random() * 2000 + 500); // Random delay 0.5-2.5s
      });

      socket.on('next-question', (data) => {
        console.log(`🎮 Player ${index + 1} received next question`);
        
        // Simulate player answering
        setTimeout(() => {
          if (data.question?.answer_options?.[0]) {
            socket.emit('submit-answer', {
              answerId: data.question.answer_options[0].id,
              questionId: data.question.id,
              answerTime: Math.floor(Math.random() * 15) + 1,
              playerId: socket.playerInfo.id
            });
            console.log(`📝 Player ${index + 1} submitted answer`);
          }
        }, Math.random() * 3000 + 500); // Random delay 0.5-3.5s
      });

      socket.on('answer-result', (data) => {
        console.log(`✅ Player ${index + 1} received answer result:`, {
          correct: data.correct,
          points: data.points
        });
      });
    });

    function cleanup() {
      console.log('🧹 Cleaning up connections...');
      hostSocket.disconnect();
      playerConnections.forEach(socket => socket.disconnect());
      console.log('✅ Test completed successfully!');
      process.exit(0);
    }

    // Start test sequence
    setTimeout(() => {
      console.log('3. Test will start when real game sessions are created...');
      console.log('   Please run a real quiz game to test auto-progression.');
      console.log('   This script monitors the socket events for verification.');
      
      // Keep script running to monitor events
      setInterval(() => {
        console.log('⏳ Monitoring for game events...');
      }, 30000);
    }, 1000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

testAutoProgression();