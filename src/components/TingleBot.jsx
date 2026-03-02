import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  deleteDoc,
  doc,
  where,
  getDocs
} from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './TingleBot.css';

const TingleBot = ({ roomId, currentUser, onUserJoin, moderationEvents }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [welcomedUsers] = useState(new Set());
  const hasProcessedUser = useRef(new Set());
  const [geminiAI, setGeminiAI] = useState(null);
  const processedMessages = useRef(new Set());

  // Helper state for Gemini AI initialization status and model
  const [geminiState, setGeminiState] = useState({
    hasGeminiAI: false,
    geminiModel: null,
    isGeminiInitializing: true, // Track initialization process
  });

  // Enhanced TingleBot profile with ultra-luxury design
  const tingleBotProfile = {
    uid: 'tinglebot_system_official_2024',
    displayName: '✨ TingleBot Premium',
    photoURL: 'https://api.dicebear.com/8.x/bottts-neutral/svg?seed=luxurybot&backgroundColor=ffd700&eyes=hearts&mouth=smile01&primaryColor=9333ea&secondaryColor=ec4899&sidesColor=f59e0b&textureColor=a855f7&topColor=06b6d4&face=round',
    role: 'system_bot',
    isBot: true,
    verified: true,
    email: 'premium@tinglebot.ai',
    systemBot: true
  };

  // Premium user detection
  const isPremiumUser = (user) => {
    const premiumRoles = ['owner', 'admin', 'moderator'];
    const premiumBadges = ['diamond_king', 'ruby_queen', 'emerald_empress', 'sapphire_goddess', 'platinum_lord', 'gold_knight'];
    return premiumRoles.includes(user?.role) || premiumBadges.includes(user?.badge) || user?.isPremium;
  };

  // Ultra-compact luxurious messages
  const messages = {
    welcome: {
      title: "🎖️ VIP",
      content: "✨ Premium Member Welcome! 🌟",
      type: "welcome_vip"
    },
    rules: {
      title: "⚡ Rules",
      content: "🚫 No personal info • Respect all • Keep clean • Have fun! 💫",
      type: "rules_compact"
    },
    premium: {
      title: "🔥 Premium",
      content: "💎 Join Premium: Custom fonts, themes, private rooms, HD audio, exclusive badges! 🚀",
      type: "premium_promo"
    },
    warning: {
      title: "⚠️ Alert",
      content: "🛡️ Respect guidelines • Violations = instant action ⚡",
      type: "warning_compact"
    }
  };

  // Initialize Gemini AI
  const initializeGeminiAI = useCallback(async () => {
    try {
      console.log('🔄 TingleBot: Initializing Gemini AI...');

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ TingleBot: No Gemini API key found in environment variables');
        setGeminiState(prev => ({ ...prev, hasGeminiAI: false, isGeminiInitializing: false }));
        return;
      }

      console.log('🧪 TingleBot: Testing Gemini AI connection...');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        }
      });

      // Test connection with timeout
      const testPromise = model.generateContent("Test connection - respond with 'OK'");
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      );

      const testResult = await Promise.race([testPromise, timeoutPromise]);
      const response = await testResult.response;
      const text = response.text();

      if (text) {
        console.log('✅ TingleBot: Gemini AI connected successfully');
        setGeminiState(prev => ({ ...prev, hasGeminiAI: true, geminiModel: model, isGeminiInitializing: false }));
        setGeminiAI(model); // Update the main state as well
      } else {
        throw new Error('No response from Gemini AI');
      }
    } catch (error) {
      console.error('❌ TingleBot: Gemini AI initialization failed:', error);

      if (error.status === 400) {
        console.error('Full error details:', error.message);
        console.warn('⚠️ TingleBot: API Key invalid or missing. TingleBot will work without AI features.');
      } else {
        console.warn('⚠️ TingleBot: Connection failed. TingleBot will work without AI features.');
      }

      setGeminiState(prev => ({ ...prev, hasGeminiAI: false, isGeminiInitializing: false }));
      setGeminiAI(null); // Ensure geminiAI state is null on failure
    }
  }, [setGeminiState]); // Removed setState dependency, use setGeminiState directly

  // Initialize bot ONCE per room with timed messages
  useEffect(() => {
    if (roomId && !isInitialized && currentUser) {
      console.log('🤖 TingleBot: Ultra Premium System Initializing...', roomId);
      
      setIsInitialized(true);
      startAutoDeleteProcess();
      
      // Start timed message system (every 10 minutes)
      startTimedMessages();
      
      // Start monitoring
      setTimeout(() => {
        startMessageMonitoring();
        startUserJoinMonitoring();
      }, 3000);
    }
  }, [roomId, currentUser, isInitialized, geminiState.hasGeminiAI]);

  // Monitor for new users joining via messages - WELCOME EVERYONE
  const startUserJoinMonitoring = () => {
    if (!roomId) return;

    console.log('👥 TingleBot: Starting UNIVERSAL user join monitoring for ALL users...');

    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const messageData = change.doc.data();
          const senderUid = messageData.sender?.uid;
          const senderName = messageData.sender?.displayName;

          // Skip ONLY TingleBot's own messages
          if (messageData.isBot || messageData.systemBot || senderUid === tingleBotProfile.uid) {
            return;
          }

          // Welcome ONLY Premium Users and Staff
          if (senderUid && senderName && 
              !hasProcessedUser.current.has(senderUid) && 
              !welcomedUsers.has(senderUid)) {

            const newUser = {
              uid: senderUid,
              displayName: senderName,
              photoURL: messageData.sender?.photoURL,
              email: messageData.sender?.email,
              role: messageData.sender?.role || 'user',
              gender: messageData.sender?.gender || 'unknown',
              badge: messageData.sender?.badge
            };

            hasProcessedUser.current.add(senderUid);

            // Welcome ONLY Premium Users and Staff
            if (isPremiumUser(newUser)) {
              welcomedUsers.add(senderUid);
              console.log(`💎 TingleBot: VIP Welcome for ${senderName} (${newUser.role})`);
              postWelcomeRule(newUser);
            } else {
              console.log(`⏭️ TingleBot: Regular user ${senderName} - no VIP welcome`);
            }
          }
        }
      });
    });

    return unsubscribe;
  };

  // Handle current user join - Welcome EVERYONE
  useEffect(() => {
    if (currentUser && currentUser.uid && isInitialized && !hasProcessedUser.current.has(currentUser.uid) && !welcomedUsers.has(currentUser.uid)) {
      console.log(`🤖 TingleBot: *** UNIVERSAL WELCOME FOR CURRENT USER *** - ${currentUser.displayName} (${currentUser.uid})`);
      console.log(`🤖 TingleBot: Role: ${currentUser.role || 'user'} - WELCOMING EVERYONE!`);

      hasProcessedUser.current.add(currentUser.uid);

      // Welcome ABSOLUTELY EVERYONE - no role restrictions
      console.log(`🚀 TingleBot: Welcoming current user ${currentUser.displayName} immediately!`);
      postWelcomeRule(currentUser);
    }
  }, [currentUser?.uid, isInitialized]);

  // Universal user join detection - Monitor for ALL users joining the room
  useEffect(() => {
    if (!roomId || !isInitialized) return;

    console.log('👥 TingleBot: UNIVERSAL user join monitoring activated for EVERYONE...');

    const usersRef = collection(db, 'rooms', roomId, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const userData = change.doc.data();
          const userUid = change.doc.id;

          console.log(`👤 TingleBot: User joined room:`, {
            uid: userUid,
            displayName: userData.displayName,
            role: userData.role || 'user',
            isOnline: userData.isOnline
          });

          // Welcome EVERYONE who joins - no restrictions
          if (userUid && userData.displayName && 
              !hasProcessedUser.current.has(userUid) && 
              !welcomedUsers.has(userUid) &&
              userData.isOnline) {

            console.log(`🎉 TingleBot: *** UNIVERSAL WELCOME VIA USERS COLLECTION *** - ${userData.displayName} (${userUid})`);
            console.log(`🎉 TingleBot: Role: ${userData.role || 'user'} - WELCOMING EVERYONE!`);

            hasProcessedUser.current.add(userUid);

            console.log(`🚀 TingleBot: Welcoming user from collection ${userData.displayName} immediately!`);
            postWelcomeRule(userData);
          }
        }
      });
    });

    return unsubscribe;
  }, [roomId, isInitialized]);

  // Role-specific VIP welcome messages with special treatment for each role
  const postWelcomeRule = async (user) => {
    if (!roomId || !user || !user.uid || welcomedUsers.has(user.uid) || !isPremiumUser(user)) {
      return;
    }

    try {
      welcomedUsers.add(user.uid);
      const userName = user.displayName || 'VIP Member';
      const userRole = user.role?.toLowerCase() || 'user';
      
      // Role-specific welcome messages with special icons and content
      let welcomeData = {};
      
      switch(userRole) {
        case 'owner':
          welcomeData = {
            icon: '👑',
            title: '👑 OWNER',
            message: `👑 Welcome Owner ${userName}! All privileges active ⚡`,
            priority: 'royal',
            bgClass: 'owner-welcome'
          };
          break;
          
        case 'admin':
          welcomeData = {
            icon: '⚡',
            title: '⚡ ADMIN',
            message: `⚡ Welcome Admin ${userName}! Full powers activated 🛡️`,
            priority: 'admin',
            bgClass: 'admin-welcome'
          };
          break;
          
        case 'moderator':
          welcomeData = {
            icon: '🛡️',
            title: '🛡️ MOD',
            message: `🛡️ Welcome Moderator ${userName}! Guardian mode on ⚔️`,
            priority: 'moderator',
            bgClass: 'moderator-welcome'
          };
          break;
          
        default:
          // Premium users with badges
          welcomeData = {
            icon: '💎',
            title: '💎 VIP',
            message: `💎 Welcome Premium ${userName}! VIP features unlocked ✨`,
            priority: 'premium',
            bgClass: 'premium-welcome'
          };
      }

      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        text: welcomeData.message,
        title: welcomeData.title,
        sender: {
          uid: tingleBotProfile.uid,
          displayName: tingleBotProfile.displayName,
          photoURL: tingleBotProfile.photoURL,
          role: tingleBotProfile.role,
          isBot: true,
          verified: true,
          systemBot: true
        },
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        type: `tinglebot_welcome_${userRole}`,
        isBot: true,
        systemBot: true,
        autoDelete: true,
        deleteAt: new Date(Date.now() + 5000), // 5 seconds
        targetUser: userName,
        targetUserId: user.uid,
        userRole: user.role,
        botVersion: '4.0',
        priority: welcomeData.priority,
        visibilityType: 'private_vip',
        publicMessage: false,
        visibleToAllUsers: false,
        privateMessage: true,
        ultraCompact: false,
        luxuryDesign: true,
        specialWelcome: true,
        welcomeClass: welcomeData.bgClass
      });

      console.log(`${welcomeData.icon} TingleBot: Special ${userRole.toUpperCase()} welcome sent to ${userName}`);
    } catch (error) {
      console.error('❌ TingleBot: VIP welcome failed:', error);
    }
  };

  // Ultra-compact moderation alerts (visible to all, 5-second auto-delete)
  const handleModerationEvent = async (type, targetUser, moderator, reason, additionalData = {}) => {
    if (!roomId || !isInitialized) return;

    const targetUserName = targetUser?.displayName || targetUser?.name || targetUser || 'User';
    const moderatorName = moderator?.displayName || moderator?.name || moderator || 'Staff';

    // Ultra-compact moderation messages with emojis
    const moderationMessages = {
      ban: `🚫 ${targetUserName} banned`,
      kick: `👢 ${targetUserName} kicked`,
      mute: `🔇 ${targetUserName} muted`,
      warning: `⚠️ ${targetUserName} warned`,
      unmute: `🔊 ${targetUserName} unmuted`,
      timeout: `⏰ ${targetUserName} timeout`
    };

    const message = moderationMessages[type];
    if (!message) return;

    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        text: message,
        title: `⚡ Moderation`,
        sender: {
          uid: tingleBotProfile.uid,
          displayName: tingleBotProfile.displayName,
          photoURL: tingleBotProfile.photoURL,
          role: tingleBotProfile.role,
          isBot: true,
          verified: true,
          systemBot: true
        },
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        type: `tinglebot_moderation_${type}`,
        isBot: true,
        systemBot: true,
        autoDelete: true,
        deleteAt: new Date(Date.now() + 5000), // 5 seconds auto-delete
        moderationInfo: { 
          action: type, 
          targetUser: targetUserName,
          targetUserId: targetUser?.uid || targetUser,
          moderator: moderatorName, 
          reason,
          ...additionalData
        },
        targetUser: targetUserName,
        priority: 'critical',
        botVersion: '4.0',
        visibleToAllUsers: true,
        publicMessage: true,
        ultraCompact: true,
        luxuryDesign: true
      });
      console.log(`⚡ TingleBot: Compact moderation alert - ${type}: ${targetUserName}`);
    } catch (error) {
      console.error('❌ TingleBot: Moderation alert failed:', error);
    }
  };

  // Enhanced auto-delete system
  const startAutoDeleteProcess = () => {
    console.log('🗑️ TingleBot: Advanced cleanup system activated');

    const interval = setInterval(async () => {
      if (!roomId) return;

      try {
        const now = new Date();
        const q = query(
          collection(db, 'rooms', roomId, 'messages'),
          where('autoDelete', '==', true)
        );

        const snapshot = await getDocs(q);
        let deletedCount = 0;

        for (const messageDoc of snapshot.docs) {
          const messageData = messageDoc.data();
          const deleteTime = messageData.deleteAt?.toDate?.() || new Date(messageData.deleteAt);

          if (deleteTime && now >= deleteTime) {
            try {
              await deleteDoc(doc(db, 'rooms', roomId, 'messages', messageDoc.id));
              deletedCount++;
            } catch (deleteError) {
              console.warn('TingleBot: Cleanup failed for message:', messageDoc.id);
            }
          }
        }

        if (deletedCount > 0) {
          console.log(`🗑️ TingleBot: Cleaned ${deletedCount} ultra-compact messages`);
        }
      } catch (error) {
        console.error('❌ TingleBot: Cleanup system error:', error);
      }
    }, 3000); // Check every 3 seconds for 5-second messages

    return () => clearInterval(interval);
  };

  // Post system status
  const postSystemStatus = async (status) => {
    if (!roomId || !isInitialized) return;

    const statusMessages = {
      online: 'TingleBot Guardian System Online - Protecting your community 24/7',
      maintenance: 'TingleBot entering maintenance mode - Service may be interrupted',
      offline: 'TingleBot Guardian System Offline - Manual moderation active'
    };

    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        text: statusMessages[status],
        title: '🤖 System Status Update',
        sender: {
          uid: tingleBotProfile.uid,
          displayName: tingleBotProfile.displayName,
          photoURL: tingleBotProfile.photoURL,
          role: tingleBotProfile.role,
          isBot: true,
          verified: true,
          systemBot: true
        },
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        type: 'tinglebot_system_status',
        isBot: true,
        systemBot: true,
        autoDelete: true,
        deleteAt: new Date(Date.now() + 10000), // 10 seconds
        priority: 'system',
        botVersion: '3.0'
      });
    } catch (error) {
      console.error('❌ TingleBot: Status update failed:', error);
    }
  };

  // Post system announcement
  const postSystemAnnouncement = async (announcement) => {
    if (!roomId || !isInitialized) return;

    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        text: announcement.message,
        title: announcement.title || 'System Announcement',
        sender: {
          uid: tingleBotProfile.uid,
          displayName: tingleBotProfile.displayName,
          photoURL: tingleBotProfile.photoURL,
          role: tingleBotProfile.role,
          isBot: true,
          verified: true,
          systemBot: true
        },
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        type: 'tinglebot_system_announcement',
        isBot: true,
        systemBot: true,
        autoDelete: true,
        deleteAt: new Date(Date.now() + 10000), // 10 seconds
        priority: announcement.priority || 'normal',
        botVersion: '3.0'
      });
      console.log('✅ TingleBot: System announcement posted');
    } catch (error) {
      console.error('❌ TingleBot: Announcement failed:', error);
    }
  };

  // Ultra-compact timed message system (every 10 minutes)
  const startTimedMessages = () => {
    console.log('⏰ TingleBot: Starting ultra-premium timed messages...');
    
    // Initial delay before first messages
    setTimeout(() => {
      postTimedMessage('rules');
    }, 30000); // 30 seconds after init
    
    // Set up 10-minute intervals for each message type
    const intervals = [];
    
    // Rules message every 10 minutes
    intervals.push(setInterval(() => {
      postTimedMessage('rules');
    }, 600000)); // 10 minutes
    
    // Premium promo every 10 minutes (offset by 3 minutes)
    setTimeout(() => {
      postTimedMessage('premium');
      intervals.push(setInterval(() => {
        postTimedMessage('premium');
      }, 600000));
    }, 180000); // Start after 3 minutes
    
    // Warning message every 10 minutes (offset by 6 minutes)
    setTimeout(() => {
      postTimedMessage('warning');
      intervals.push(setInterval(() => {
        postTimedMessage('warning');
      }, 600000));
    }, 360000); // Start after 6 minutes
    
    return () => intervals.forEach(interval => clearInterval(interval));
  };

  // Post timed messages with 5-second auto-delete
  const postTimedMessage = async (messageType) => {
    if (!roomId || !isInitialized) return;
    
    const messageData = messages[messageType];
    if (!messageData) return;
    
    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        text: messageData.content,
        title: messageData.title,
        sender: {
          uid: tingleBotProfile.uid,
          displayName: tingleBotProfile.displayName,
          photoURL: tingleBotProfile.photoURL,
          role: tingleBotProfile.role,
          isBot: true,
          verified: true,
          systemBot: true
        },
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        type: `tinglebot_${messageData.type}`,
        isBot: true,
        systemBot: true,
        autoDelete: true,
        deleteAt: new Date(Date.now() + 5000), // 5 seconds auto-delete
        visibleToAllUsers: true,
        publicMessage: true,
        priority: messageType === 'premium' ? 'high' : 'normal',
        botVersion: '4.0',
        ultraCompact: true,
        luxuryDesign: true
      });
      
      console.log(`✨ TingleBot: ${messageType} message posted (5s auto-delete)`);
    } catch (error) {
      console.error(`❌ TingleBot: Failed to post ${messageType} message:`, error);
    }
  };

  // Start monitoring messages for @TingleBot mentions
  const startMessageMonitoring = () => {
    if (!roomId) return;

    console.log('👁️ TingleBot: Starting enhanced message monitoring for @mentions');

    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const messageData = change.doc.data();
          const messageId = change.doc.id;

          console.log('📨 TingleBot: New message detected:', {
            messageId,
            text: messageData.text?.substring(0, 50) + '...',
            senderUid: messageData.sender?.uid,
            senderName: messageData.sender?.displayName,
            isBot: messageData.isBot || false,
            systemBot: messageData.systemBot || false,
            timestamp: messageData.timestamp
          });

          // Skip if already processed or is from TingleBot itself
          if (processedMessages.current.has(messageId)) {
            console.log('⏭️ TingleBot: Already processed message:', messageId);
            return;
          }

          if (messageData.sender?.uid === tingleBotProfile.uid ||
              messageData.isBot === true ||
              messageData.systemBot === true) {
            console.log('⏭️ TingleBot: Skipping bot message');
            processedMessages.current.add(messageId);
            return;
          }

          if (!messageData.text || !messageData.sender) {
            console.log('⏭️ TingleBot: Invalid message data');
            processedMessages.current.add(messageId);
            return;
          }

          processedMessages.current.add(messageId);

          // Enhanced mention detection with case-insensitive patterns
          if (messageData.text && typeof messageData.text === 'string') {
            const messageText = messageData.text.toLowerCase().trim();
            const originalText = messageData.text.trim();

            // More comprehensive mention patterns
            const mentionPatterns = [
              '@tinglebot', 'tinglebot', '@TingleBot', 'TingleBot', 
              'tingle bot', '@tingle', 'hey tinglebot', 'hello tinglebot', 
              'hello @tinglebot', 'hi tinglebot', 'hi @tinglebot', 
              'hey @tinglebot', '@tingle bot', 'tinglebots', 'hello@tinglebot'
            ];

            // Check if message contains any mention pattern
            const hasMention = mentionPatterns.some(pattern => {
              const lowerPattern = pattern.toLowerCase();
              return messageText.includes(lowerPattern);
            });

            console.log('🔍 TingleBot: Checking message:', messageText);
            console.log('🔍 TingleBot: Original message:', originalText);
            console.log('🔍 TingleBot: Has mention:', hasMention);
            console.log('🔍 TingleBot: From user:', messageData.sender?.displayName);
            console.log('🔍 TingleBot: Message ID:', messageId);

            if (hasMention) {
              console.log('🎯 TingleBot: *** MENTION DETECTED *** from:', messageData.sender?.displayName);
              console.log('🎯 TingleBot: Original message:', originalText);
              console.log('🎯 TingleBot: Triggering AI response IMMEDIATELY...');

              // Force immediate response with error handling
              try {
                handleAIResponse(messageData, messageId);
              } catch (error) {
                console.error('❌ TingleBot: Error in handleAIResponse:', error);
                // Emergency fallback
                setTimeout(() => {
                  console.log('🚨 TingleBot: Emergency fallback response');
                  handleAIResponse(messageData, messageId);
                }, 1000);
              }
            }
          }
        }
      });
    });

    return unsubscribe;
  };

  // Generate AI response using Gemini
  const handleAIResponse = async (originalMessage, messageId) => {
    console.log('🚀 TingleBot: *** handleAIResponse ACTIVATED ***');
    console.log('🚀 TingleBot: Response data:', {
      hasGeminiAI: geminiState.hasGeminiAI,
      messageText: originalMessage.text,
      messageId,
      senderName: originalMessage.sender?.displayName,
      senderUid: originalMessage.sender?.uid,
      roomId: roomId
    });

    const userName = originalMessage.sender?.displayName || originalMessage.sender?.email?.split('@')[0] || 'User';

    console.log(`🎯 TingleBot: *** IMMEDIATE RESPONSE to ${userName} ***`);
    console.log(`🎯 TingleBot: Room: ${roomId}, Message: "${originalMessage.text}"`);

    // Enhanced smart responses based on user message
    const userText = originalMessage.text?.toLowerCase() || '';
    let smartResponse;

    if (userText.includes('hello') || userText.includes('hi') || userText.includes('hey')) {
      smartResponse = `Hello there ${userName}! 👋 I'm TingleBot, your friendly AI assistant! How can I help you today? 🤖✨`;
    } else if (userText.includes('help')) {
      smartResponse = `I'd love to help you ${userName}! 🤖 What do you need assistance with? I can help with community questions, rules, or just have a friendly chat! 💙`;
    } else if (userText.includes('rules')) {
      smartResponse = `Great question about rules ${userName}! 📜 Keep things respectful, family-friendly, and don't share personal info. Be awesome to each other! That's the TingleTap way! 🌟`;
    } else if (userText.includes('how are you')) {
      smartResponse = `I'm doing great ${userName}! 😊 Always happy to chat with awesome community members like you! How are you doing today? 🤖💙`;
    } else if (userText.includes('what can you do')) {
      smartResponse = `I can help with community questions ${userName}, explain rules, have friendly chats, and keep our space safe! What would you like to know? 🤖⚡`;
    } else {
      smartResponse = `Hi ${userName}! 👋 I'm TingleBot and I heard you mention me! 🤖 How can I help you today? Feel free to ask me anything! 💫`;
    }

    console.log(`📤 TingleBot: Preparing response: "${smartResponse}"`);

    // Force immediate response with no delays
    console.log('🚀 TingleBot: Posting response immediately...');

    try {
      await postAIResponse(smartResponse, originalMessage, userName, messageId);
      console.log('✅ TingleBot: Response successfully posted!');
    } catch (error) {
      console.error('❌ TingleBot: Failed to post response:', error);
    }

    // Try enhanced AI response in background if available
    if (geminiState.hasGeminiAI && geminiState.geminiModel) { // Use geminiState
      setTimeout(async () => {
        try {
          await generateEnhancedAIResponse(originalMessage, userName, messageId);
        } catch (error) {
          console.log('⚠️ TingleBot: AI enhancement failed, basic response already posted');
        }
      }, 3000);
    }
  };

  // New function for enhanced AI responses
  const generateEnhancedAIResponse = async (originalMessage, userName, messageId) => {
    try {

      // Clean the user message
      let userMessage = originalMessage.text
        ?.replace(/@TingleBot/gi, '')
        ?.replace(/@tinglebot/gi, '')
        ?.replace(/tinglebot/gi, '')
        ?.replace(/tingle bot/gi, '')
        ?.replace(/@tingle/gi, '')
        ?.replace(/hello@tinglebot/gi, 'hello')
        ?.trim() || "Hello!";

      if (!userMessage || userMessage.length < 1) {
        userMessage = "Hello!";
      }

      const prompt = `You are TingleBot, a friendly AI assistant for TingleTap Community chat room. 

User "${userName}" mentioned you and said: "${userMessage}"

Respond as TingleBot following these guidelines:
- Be helpful, friendly, and concise (max 60 words)
- Use modern, engaging language with appropriate emojis
- If they greet you (hello/hi), greet them back warmly
- If they ask about community rules: mention respect, no personal info sharing, family-friendly content
- If inappropriate request, politely redirect to positive topics
- Be conversational and natural
- Always address them as @${userName} at the start
- Answer their question directly if they asked something specific

Generate a helpful, friendly response:`;

      console.log('🧠 TingleBot: Generating enhanced AI response...');

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI request timeout')), 3000)
      );

      const aiPromise = geminiState.geminiModel.generateContent(prompt); // Use geminiState.geminiModel
      const result = await Promise.race([aiPromise, timeoutPromise]);
      const response = await result.response;
      let aiReply = response.text().trim();

      // Ensure proper formatting
      if (!aiReply.startsWith(`@${userName}`)) {
        aiReply = `@${userName} ${aiReply}`;
      }

      console.log('✅ TingleBot: Enhanced AI response generated:', aiReply);

      // Post enhanced AI response
      await postEnhancedAIResponse(aiReply, originalMessage, userName, messageId);

    } catch (error) {
      console.log('⚠️ TingleBot: AI enhancement failed, fallback already posted:', error.message);
    }
  };

  // Post AI-generated response with improved reliability - Fixed to appear in chat feed
  const postAIResponse = async (aiReply, originalMessage, userName, messageId) => {
    console.log('📤 TingleBot: *** POSTING RESPONSE TO CHAT FEED ***');
    console.log('📤 TingleBot: Reply text:', aiReply);
    console.log('📤 TingleBot: For user:', userName);
    console.log('📤 TingleBot: Room ID:', roomId);

    if (!roomId) {
      console.error('❌ TingleBot: No room ID available');
      return;
    }

    if (!aiReply || !userName) {
      console.error('❌ TingleBot: Missing reply text or username');
      return;
    }

    try {
      // Clean the AI reply
      let cleanAiReply = aiReply.trim();

      // Create message data that matches the welcome message format exactly
      const messageData = {
        text: cleanAiReply,
        title: '🤖 TingleBot Assistant',
        sender: {
          uid: tingleBotProfile.uid,
          displayName: 'TingleBot Assistant',
          photoURL: tingleBotProfile.photoURL,
          role: tingleBotProfile.role,
          isBot: true,
          verified: true,
          systemBot: true
        },
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        type: 'tinglebot_ai_assistant_response',
        isBot: true,
        systemBot: true,
        autoDelete: true,
        deleteAt: new Date(Date.now() + 10000), // CONSISTENT 10 seconds for all TingleBot messages
        targetUser: userName,
        targetUserId: originalMessage.sender?.uid,
        priority: 'high',
        botVersion: '3.0',
        inReplyTo: messageId,
        aiResponse: true
      };

      console.log('📤 TingleBot: Posting to chat feed...');
      console.log('📤 TingleBot: Message structure:', {
        text: cleanAiReply,
        title: messageData.title,
        displayName: messageData.sender.displayName,
        type: messageData.type,
        isBot: messageData.isBot,
        systemBot: messageData.systemBot
      });

      const messagesRef = collection(db, 'rooms', roomId, 'messages');
      const docRef = await addDoc(messagesRef, messageData);

      console.log(`✅ TingleBot: *** CHAT MESSAGE POSTED SUCCESSFULLY! *** ID: ${docRef.id}`);
      console.log(`✅ TingleBot: Response: "${cleanAiReply}"`);
      console.log(`✅ TingleBot: Should now appear in chat feed for all users!`);

    } catch (error) {
      console.error('❌ TingleBot: Failed to post to chat feed:', error);

      // Emergency fallback with simpler structure
      try {
        console.log('🚨 TingleBot: Emergency fallback to chat feed...');

        const emergencyData = {
          text: `@${userName} Hello! 👋 I'm TingleBot Assistant and I heard you mention me! How can I help? 🤖✨`,
          sender: {
            uid: tingleBotProfile.uid,
            displayName: 'TingleBot Assistant',
            photoURL: tingleBotProfile.photoURL,
            isBot: true,
            systemBot: true
          },
          timestamp: serverTimestamp(),
          createdAt: new Date(),
          type: 'tinglebot_emergency_response',
          isBot: true,
          systemBot: true,
          autoDelete: true,
          deleteAt: new Date(Date.now() + 30000)
        };

        const emergencyRef = await addDoc(collection(db, 'rooms', roomId, 'messages'), emergencyData);
        console.log(`✅ TingleBot: Emergency response posted to chat feed: ${emergencyRef.id}`);
      } catch (emergencyError) {
        console.error('❌ TingleBot: Emergency fallback also failed:', emergencyError);
      }
    }
  };

  // Enhanced AI response posting
  const postEnhancedAIResponse = async (aiReply, originalMessage, userName, messageId) => {
    // Use the same posting logic but with different metadata
    await postAIResponse(aiReply, originalMessage, userName, messageId);
  };

  // Listen for moderation events and handle them
  useEffect(() => {
    if (moderationEvents && isInitialized) {
      const { type, user, moderator } = moderationEvents;

      console.log('🤖 TingleBot: Processing moderation event:', moderationEvents);

      handleModerationEvent(
        type,
        user,
        moderator,
        moderationEvents.reason || 'No reason provided'
      );
    }
  }, [moderationEvents, isInitialized]);

  // Make methods available globally
  React.useEffect(() => {
    window.tingleBot = {
      postSystemAnnouncement,
      handleModerationEvent,
      postSystemStatus,
      handleAIResponse,
      isReady: isInitialized,
      profile: tingleBotProfile,
      version: '3.0',
      aiEnabled: geminiState.hasGeminiAI // Use geminiState
    };
  }, [isInitialized, geminiState.hasGeminiAI]); // Ensure dependency reflects the state used

  // Initialize Gemini AI on component mount
  useEffect(() => {
    initializeGeminiAI();
  }, [initializeGeminiAI]);

  // TingleBot works in background - no UI rendering
  return null;
};

export default TingleBot;