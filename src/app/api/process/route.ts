// src/app/api/process/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { google } from 'googleapis';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emailContent } = body;

    if (!emailContent) {
      return NextResponse.json({ error: 'Email content is required' }, { status: 400 });
    }

    //free alternative for gpt3.5, which was paid
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });

    //prompting for ai model, generated using another ai model
    const prompt = `
      You are a world-class intelligence analyst specializing in extracting precise information from complex email chains. Your task is to identify who is performing a print action and what they are printing. You must follow a strict order of operations and reasoning.

      ### MASTER RULE: Analyze the email content in the prioritized order specified below.

      ---
      ### Rule for 'whatIsBeingPrinted':
      1.  **Body First:** Read the email body for explicit instructions. If it mentions printing an attachment (e.g., "print the attached"), use "Attachment". If it mentions a specific document (e.g., "print the schedules below"), use that document's name.
      2.  **Fallback to Subject:** ONLY if the body is not specific (e.g., "Please print."), use the email's 'Subject:' line. Clean the subject by removing prefixes like "Re:", "Fw:", "Fwd:".
      3.  **Last Resort:** If no specific item can be found, return "Unknown".

      ---
      ### Rule for 'whoIsPrintingIt':
      1.  **Body First (with Pronoun Resolution):** Read the email body for the requester's identity.
          - **Crucial Sub-Rule:** If the body uses a pronoun like "I" or "we" to describe the person printing (e.g., "I am printing it," or "We are printing for her"), you MUST identify the sender of that specific message segment. Find the 'From:' line that directly precedes that text to determine the true identity.
          - If the body explicitly names a person (e.g., "Huma here, please print..."), use that name.
      2.  **Fallback to 'From:' Header:** ONLY if the body does not identify the person (e.g., the body is just "Pls print"), then use the name from the 'From:' line of the most recent message in the thread.
      3.  **Last Resort:** If no sender can be identified, return "Unknown".

      ---
      ### EXAMPLES (Demonstrating the complex logic):

      **Example 1 (Simple Fallback):**
      Email Content:
      """
      From: H <hrod17@clintonemail.com>
      Subject: Re: Fw: NYT story
      Please print.
      """
      *Reasoning: Body is generic. Fallback to Subject ("NYT story") and From header ("H").*
      Correct JSON Output:
      { "whatIsBeingPrinted": "NYT story", "whoIsPrintingIt": "H" }

      **Example 2 (Context from Body):**
      Email Content:
      """
      From: some.assistant@state.gov
      Subject: For your review
      H, it's Huma. Can you please print the attached for me?
      """
      *Reasoning: Body explicitly self-identifies as "Huma", overriding the From header.*
      Correct JSON Output:
      { "whatIsBeingPrinted": "Attachment", "whoIsPrintingIt": "Huma" }

      **Example 3 (Pronoun Resolution in a Chain):**
      Email Content:
      """
      From: Abedin, Huma <AbedinH@state.gov>
      Sent: Monday, October 25, 2010 11:39 AM
      To: Slaughter, Anne-Marie; H
      Subject: RE: Trip reading -- Bangladesh is following the lead of the QDDR
      Thanks ams. We are printing for her
      """
      *Reasoning: Body says "We are printing". 'We' is a pronoun. I must find the sender of this message. The preceding 'From:' line is 'Abedin, Huma'. Therefore, "We" resolves to "Abedin, Huma".*
      Correct JSON Output:
      { "whatIsBeingPrinted": "Trip reading -- Bangladesh is following the lead of the QDDR", "whoIsPrintingIt": "Abedin, Huma" }
      
      ---
      ### YOUR TASK:
      Analyze the following email content using the prioritized rules and sub-rules. Respond with ONLY the raw JSON object.

      Email Content:
      """
      ${emailContent}
      """
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();
    
    const cleanedJsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

    const { whatIsBeingPrinted, whoIsPrintingIt } = JSON.parse(cleanedJsonText);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const newRow = [
        emailContent,
        whatIsBeingPrinted || "Unknown",
        whoIsPrintingIt || "Unknown",
    ];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ success: true, message: 'Data added to Google Sheet!' });

  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof SyntaxError) {
        console.error("Failed to parse JSON from model response:", (error as any).cause);
    }
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to process email.', details: errorMessage }, { status: 500 });
  }
}