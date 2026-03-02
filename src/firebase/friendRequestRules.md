
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Friend requests collection
    match /friendRequests/{requestId} {
      // Allow read if user is sender or receiver
      allow read: if request.auth != null && 
        (resource.data.senderId == request.auth.uid || 
         resource.data.receiverId == request.auth.uid);
      
      // Allow create if user is the sender
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.senderId &&
        validateFriendRequest();
      
      // Allow update if user is receiver (for accepting/rejecting)
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.receiverId &&
        validateFriendRequestUpdate();
      
      // Allow delete if user is sender or receiver
      allow delete: if request.auth != null && 
        (resource.data.senderId == request.auth.uid || 
         resource.data.receiverId == request.auth.uid);
      
      function validateFriendRequest() {
        return resource.data.keys().hasAll(['senderId', 'receiverId', 'senderName', 'status', 'createdAt']) &&
               resource.data.status == 'pending';
      }
      
      function validateFriendRequestUpdate() {
        return resource.data.status in ['accepted', 'rejected'] &&
               resource.data.keys().hasAll(['senderId', 'receiverId', 'status']);
      }
    }
    
    // Users collection (for friend lists and profile access)
    match /users/{userId} {
      // Users can read and write their own profile
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Users can read other profiles for friend requests and general app functionality
      allow read: if request.auth != null;
      
      // Allow updating friends list during friend request acceptance
      allow update: if request.auth != null && 
        request.auth.uid == userId &&
        onlyUpdatingAllowedFields();
      
      function onlyUpdatingAllowedFields() {
        return request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['friends', 'lastLogin', 'isOnline', 'fontPreferences', 'darkMode', 'selectedTheme']);
      }
    }
    
    // Username collection
    match /usernames/{username} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.uid;
    }
    
    // Private messages collection
    match /privateMessages/{messageId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      allow create: if request.auth != null && 
        request.auth.uid in request.resource.data.participants;
    }
    
    // Rooms collection
    match /rooms/{roomId} {
      allow read: if request.auth != null;
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
    
    // Reports collection
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null;
    }
  }
}
