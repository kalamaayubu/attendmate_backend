import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
type NotificationPayload = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

async function sendNotification({
  token,
  title,
  body,
  data,
}: NotificationPayload) {
  // Log FCM endpoint and credentials for debugging
  const urel = `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`;
  console.log("FCM URL:", urel);
  console.log("Client email:", process.env.FIREBASE_CLIENT_EMAIL);
  console.log("Project ID:", process.env.FIREBASE_PROJECT_ID);

  // Prepare Google Auth client that can request access tokens for FCM
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  // Give client capability to request access tokens
  const client = await auth.getClient();

  // FCM v1 HTTP endpoint for sending messages
  const url = `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`;

  // The actual payload to send to FCM
  // Can be extended with additional data messages, images, etc.
  const message = {
    message: {
      token,
      notification: {
        title,
        body,
      },
      data,
    },
  };

  const res = await client.request({
    url,
    method: "POST",
    data: message,
  });

  return res.data; // Return FCM response
}

// API route handler for post requests
export async function POST(req: NextRequest) {
  try {
    // Parse the incoming request body
    const body = await req.json();
    const { tokens, title, body: messageBody, data } = body;

    // Validate that tokens array is provided
    if (!tokens || !Array.isArray(tokens)) {
      return NextResponse.json(
        { error: "Invalid or missing tokens array" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const results = [];

    // Send notification to each recipient sequentially
    // You can optimize this later with Promise.all for concurrency
    for (const token of tokens) {
      const res = await sendNotification({
        token,
        title,
        body: messageBody,
        data,
      });
      results.push(res);
    }

    // Return a JSON response with all FCM results
    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    // Catch and return any errors
    console.error(err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
