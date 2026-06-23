(async () => {
  try {
    const response = await fetch("http://localhost:3000/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "add a task for reading" })
    });
    console.log(response.status);
    const text = await response.text();
    console.log(text);
  } catch (e) {
    console.error("Fetch failed:", e);
  }
})();
