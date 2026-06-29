const fs = require('fs');
require('dotenv').config();

async function test() {
  const prompt = "Describe solo y unicamente el color principal que ves en esta imagen.";
  
  // create a dummy 1x1 red pixel image in base64
  const redBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const blueBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGAW0e3/wAAAABJRU5ErkJggg==";

  const messagesRed = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:image/png;base64,${redBase64}` } }
      ]
    }
  ];

  const messagesBlue = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:image/png;base64,${blueBase64}` } }
      ]
    }
  ];

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log("No OPENROUTER_API_KEY found.");
    return;
  }

  async function call(messages) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.1
      })
    });
    const data = await response.json();
    return data;
  }

  const redRes = await call(messagesRed);
  console.log("RED:", JSON.stringify(redRes.choices[0].message.content));
  
  const blueRes = await call(messagesBlue);
  console.log("BLUE:", JSON.stringify(blueRes.choices[0].message.content));
}
test();
