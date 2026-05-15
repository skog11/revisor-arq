async function test() {
  const OLLAMA_URL = "http://127.0.0.1:11434/api/embed";
  const OLLAMA_MODEL = "mxbai-embed-large";
  
  console.log("Testing Ollama embedding...");
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        input: ["Hola mundo", "Test de embedding"],
      }),
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Embeddings received:", json.embeddings?.length);
    console.log("Dimension:", json.embeddings?.[0]?.length);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
