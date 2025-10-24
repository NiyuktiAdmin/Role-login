import { Client, Users, Databases, Query, ID } from 'node-appwrite';

const DATABASE_ID = '68511f1f00196ce07f7e';
const USERS_COLLECTION_ID = 'users';

export default async ({ req, res, log, error }) => {
  log('Attempting to create/retrieve user document for Google Login.');

  // ✅ Get userId from headers (where Appwrite passes it)
  const userId = req.headers['x-appwrite-user-id'] || req.env?.APPWRITE_FUNCTION_USER_ID;
  
  log(`User ID from request: ${userId}`);

  if (!userId) {
    error('No user ID found in request');
    return res.json(
      { status: 'failure', message: 'Authentication required. No user session found.' },
      401
    );
  }

  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const users = new Users(client);
    const databases = new Databases(client);

    // ✅ Check if user document already exists
    const existingDocs = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('uid', userId)]
    );

    if (existingDocs.documents.length > 0) {
      const existingUser = existingDocs.documents[0];
      log(`User already exists: ${existingUser.email} | Role: ${existingUser.Role || 'student'}`);
      return res.json({
        status: 'success',
        data: existingUser,
        message: 'User retrieved successfully.',
      });
    }

    // ✅ Get authenticated user details
    const authUser = await users.get(userId);
    log(`Retrieved auth user: ${authUser.email}`);

    // ✅ Match your schema exactly
    const newUserData = {
      uid: userId,
      name: authUser.name || 'User',
      email: authUser.email || '',
      profileImage:
        'https://fastly.picsum.photos/id/866/200/200.jpg?hmac=i0ngmQOk9dRZEzhEosP31m_vQnKBQ9C19TBP1CGoIUA',
      Role: 'student',
      purchased: false,
      deviceId: '',
      walletBalance: 0.0,
      referralCode: '',
      upiId: '',
      upiVerified: false,
    };

    // ✅ Create the document
    const newDocument = await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      ID.unique(),
      newUserData
    );

    log(`New user created: ${newDocument.email} | Role: student`);

    return res.json({
      status: 'success',
      data: newDocument,
      message: 'New user created successfully.',
    });
  } catch (e) {
    error(`Error creating/retrieving user: ${e.message}`);
    return res.json(
      { status: 'failure', message: `An error occurred: ${e.message}` },
      500
    );
  }
};