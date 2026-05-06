const tabNameInput = document.getElementById("tabNameInput");
const saveTabNameBtn = document.getElementById("saveTabNameBtn");
const resetTabNameBtn = document.getElementById("resetTabNameBtn");

const savedTabName = localStorage.getItem("customTabName");

if (savedTabName) {
  document.title = savedTabName;
  tabNameInput.value = savedTabName;
}

saveTabNameBtn.addEventListener("click", () => {
  const newTabName = tabNameInput.value.trim();

  if (newTabName.length === 0) {
    return;
  }

  localStorage.setItem("customTabName", newTabName);
  document.title = newTabName;
});

resetTabNameBtn.addEventListener("click", () => {
  localStorage.removeItem("customTabName");
  document.title = "Game Hub";
  tabNameInput.value = "";
});
const gameGrid = document.getElementById("gameGrid");

fetch("./games.json?ts=" + Date.now())
  .then((response) => {
    if (!response.ok) {
      throw new Error("Failed to load games.json");
    }
    return response.json();
  })
  .then((games) => {
    gameGrid.innerHTML = "";

    games.forEach((game) => {
      const card = document.createElement("div");
      card.className = "game-card";

      const image = document.createElement("img");
      image.className = "game-thumb";

      // 🔥 ONLY eaglercraft fix
      if (game.id === "eaglercraft") {
        image.classList.add("zoom-fix");
      }

      image.src = game.image || "https://via.placeholder.com/300";
      image.alt = game.title;

      const info = document.createElement("div");
      info.className = "game-info";

      const title = document.createElement("h2");
      title.className = "game-title";
      title.textContent = game.title;

      info.appendChild(title);
      card.appendChild(image);
      card.appendChild(info);

      card.addEventListener("click", () => {
        window.open(game.iframe, "_blank");
      });

      gameGrid.appendChild(card);
    });
  })
  .catch((error) => {
    console.error(error);
    gameGrid.innerHTML = `<p style="color:red;">Error loading games</p>`;
  });