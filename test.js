const fetch = require('node:fetch');
(async () => {
  const response = await fetch("http://localhost:3000/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "I need to plan a meeting" })
  });
  console.log(response.status);
  const text = await response.text();
  console.log(text);
})();
