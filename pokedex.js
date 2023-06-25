"use strict";

(function() {
  window.addEventListener("load", init);

  const API_BASE_URL = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/";
  const SPRITE_BASE_URL = API_BASE_URL + "sprites/";
  const PERCENTAGE = 100;
  const LOW_PERCENTAGE = 20;
  let guid = "";
  let pid = "";
  let originalHp = "";
  let opponentOriginalHp = "";

  /**
   * Initializes event listeners for the page.
   */
  function init() {
    fetchPic();
    id("start-btn").addEventListener("click", startBattle);
    id("endgame").addEventListener("click", endGame);
    id("flee-btn").addEventListener("click", flee);

    let moveButtons = qsa("#p1 .moves button");
    for (let button of moveButtons) {
      button.addEventListener("click", function() {
        makeMove(button.querySelector(".move").textContent);
      });
    }
  }

  /**
   * Fetches the Pokemon list and displays their images.
   */
  function fetchPic() {
    fetch(API_BASE_URL + "pokedex.php?pokedex=all")
      .then(statusCheck)
      .then(response => response.text())
      .then(parsePokemonList)
      .catch(console.error);
  }

  /**
   * Parses the Pokemon list data and adds them to the Pokedex view.
   *
   * @param {string} data - Pokemon list data.
   */
  function parsePokemonList(data) {
    let pokemons = data.trim().split(/:|\n/);
    let pokedexView = id("pokedex-view");
    for (let i = 1; i < pokemons.length; i += 2) {
      let image = gen("img");
      image.src = SPRITE_BASE_URL + pokemons[i] + ".png";
      image.alt = pokemons[i - 1];
      image.classList.add("sprite");
      findInitPokemons(image, pokemons, i);
      image.addEventListener("click", function() {
        fetchPokemonInfo(this);
      });
      image.setAttribute('id', pokemons[i]);
      pokedexView.appendChild(image);
    }
  }

  /**
   * Finds the initial Pokemons in the list and marks them as found.
   *
   * @param {HTMLElement} image - Image element representing the Pokemon.
   * @param {Array<string>} pokemons - Array of Pokemon names and IDs.
   * @param {number} i - Index of the current Pokemon in the list.
   */
  function findInitPokemons(image, pokemons, i) {
    if (pokemons[i] === "bulbasaur" || pokemons[i] === "charmander" || pokemons[i] === "squirtle") {
      image.classList.add("found");
    }
  }

  /**
   * Fetches Pokemon information and populates the Pokemon card.
   *
   * @param {HTMLElement} pokemon - Image element representing the Pokemon.
   */
  function fetchPokemonInfo(pokemon) {
    if (pokemon.classList.contains("found")) {
      fetch(API_BASE_URL + "pokedex.php?pokemon=" + pokemon.id)
        .then(statusCheck)
        .then(response => response.json())
        .then((response) => {
          populatePokemonCard(response, "p1");
        })
        .catch(console.error);
    }
  }

  /**
   * Populates the Pokemon card with the given data.
   *
   * @param {Object} data - Data containing Pokemon information.
   * @param {string} player - Player identifier ("p1" or "p2").
   */
  function populatePokemonCard(data, player) {
    let card = id(player);
    card.querySelector(".name").textContent = data.name;
    card.querySelector(".pokepic").src = API_BASE_URL + data.images.photo;
    card.querySelector(".type").src = API_BASE_URL + data.images.typeIcon;
    card.querySelector(".weakness").src = API_BASE_URL + data.images.weaknessIcon;
    card.querySelector(".hp").textContent = data.hp + "HP";
    card.querySelector(".info").textContent = data.info.description;

    let moveButtons = card.querySelectorAll(".moves button");
    for (let i = 0; i < moveButtons.length; i++) {
      moveButtons[i].classList.add("hidden");
      if (i < data.moves.length) {
        moveButtons[i].querySelector(".move").textContent = data.moves[i].name;
        moveButtons[i].querySelector("img").src = API_BASE_URL + "icons/" +
        data.moves[i].type + ".jpg";
        if (data.moves[i].dp) {
          moveButtons[i].querySelector(".dp").textContent = data.moves[i].dp + " DP";
        } else {
          moveButtons[i].querySelector(".dp").textContent = "";
        }
        moveButtons[i].classList.remove("hidden");
      }
    }
    if (card === id("p1")) {
      id("start-btn").classList.remove("hidden");
      originalHp = data.hp;
    } else if (card === id("p2")) {
      opponentOriginalHp = data.hp;
    }
  }

  /**
   * Retrieves the Pokemon's name and formats it appropriately.
   * @returns {string} The formatted Pokemon name.
   */
  function getPokemonName() {
    let pokemon = qs("#p1 .name").textContent;
    pokemon = pokemon.replace(/([\s)'"])+/g, '');
    pokemon = pokemon.replace(/([.(])+/g, '-');
    return pokemon.toLowerCase();
  }

  /**
   * Initiates a fetch request to start a new game with the given Pokemon name.
   * @param {string} pokemon - The formatted Pokemon name.
   * @returns {Promise<Response>} A promise that resolves to the fetch Response object.
   */
  function startFetch(pokemon) {
    return fetch(API_BASE_URL + "game.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `startgame=true&mypokemon=${pokemon}`
    });
  }

  /**
   * Updates the user interface with the new game state information.
   * @param {object} gameState - The game state information returned from the server.
   */
  function updateUI(gameState) {
    guid = gameState.guid;
    pid = gameState.pid;
    populatePokemonCard(gameState.p2, "p2");
    id("pokedex-view").classList.add("hidden");
    id("p2").classList.remove("hidden");
    id("results-container").classList.remove("hidden");
    qs("#p1 .hp-info").classList.remove("hidden");
    id("flee-btn").classList.remove("hidden");
    id("start-btn").classList.add("hidden");
    document.querySelector("h1").textContent = "Pokemon Battle!";
    let moveButtons = qsa("#p1 .moves button");
    for (let button of moveButtons) {
      if (!button.classList.contains("hidden")) {
        button.disabled = false;
      }
    }
  }

  /**
   * Starts a new battle by fetching the game state and updating the user interface.
   */
  function startBattle() {
    const pokemon = getPokemonName();
    startFetch(pokemon)
      .then(statusCheck)
      .then(response => response.json())
      .then(gameState => {
        updateUI(gameState);
      })
      .catch(console.error);
  }

  /**
   * Ends the current game and resets the game state.
   */
  function endGame() {
    id("pokedex-view").classList.remove("hidden");
    id("p2").classList.add("hidden");
    id("results-container").classList.add("hidden");
    id("endgame").classList.add("hidden");
    id("flee-btn").classList.add("hidden");
    qs("#p1 .hp-info").classList.add("hidden");
    id("start-btn").classList.remove("hidden");
    qs("h1").textContent = "Your Pokedex";
    id("p1").querySelector(".hp").textContent = originalHp + "HP";
    id("p1").querySelector(".health-bar").style.width = "100%";
    id("p1").querySelector(".health-bar").classList.remove("low-health");
    id("p2").querySelector(".hp").textContent = opponentOriginalHp + "HP";
    id("p2").querySelector(".health-bar").style.width = "100%";
    id("p2").querySelector(".health-bar").classList.remove("low-health");
  }

  /**
   * Flees from the current battle.
   */
  function flee() {
    fetch(API_BASE_URL + "game.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `guid=${guid}&pid=${pid}&move=flee`
    })
      .then(statusCheck)
      .then(response => response.json())
      .then(() => {
        id("p1").querySelector(".health-bar").style.width = "0%";
        id("p1").querySelector(".health-bar").classList.add("low-health");
        id("p1").querySelector(".hp").textContent = "0HP";
        qs("h1").textContent = "You lost!";
        id("endgame").classList.remove("hidden");
        id("flee-btn").classList.add("hidden");
        let moveButtons = qsa("#p1 .moves button");
        for (let button of moveButtons) {
          button.disabled = true;
        }
      })
      .catch(console.error);
  }

  /**
   * Makes a move in the game and updates the game state accordingly.
   *
   * @param {string} moveName - Name of the move to be used.
   */
  function makeMove(moveName) {
    id("loading").classList.remove("hidden");

    fetch(API_BASE_URL + "game.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `guid=${guid}&pid=${pid}&move=${moveName}`
    })
      .then(statusCheck)
      .then(response => response.json())
      .then(updateGameState)
      .catch(console.error)
      .finally(() => {
        id("loading").classList.add("hidden");
      });
  }

  /**
   * Updates the game state based on the response from the server.
   *
   * @param {Object} gameState - Game state object from the server.
   */
  function updateGameState(gameState) {
    id("p1").querySelector(".hp").textContent = gameState.p1["current-hp"] + "HP";
    id("p2").querySelector(".hp").textContent = gameState.p2["current-hp"] + "HP";
    updateHealthBar("p1", gameState.p1["current-hp"], gameState.p1.hp);
    updateHealthBar("p2", gameState.p2["current-hp"], gameState.p2.hp);
    displayTurnResults(gameState);
    if (gameState.p1["current-hp"] === 0 || gameState.p2["current-hp"] === 0) {
      handleEndOfGame(gameState);
    }
    id("loading").classList.add("hidden");
  }

  /**
   * Updates the health bar of the specified player.
   *
   * @param {string} player - Player identifier ("p1" or "p2").
   * @param {number} currentHp - Current HP of the player's Pokemon.
   * @param {number} maxHp - Maximum HP of the player's Pokemon.
   */
  function updateHealthBar(player, currentHp, maxHp) {
    let healthBar = id(player).querySelector(".health-bar");
    let percentage = (currentHp / maxHp) * PERCENTAGE;
    healthBar.style.width = percentage + "%";

    if (percentage < LOW_PERCENTAGE) {
      healthBar.classList.add("low-health");
    } else {
      healthBar.classList.remove("low-health");
    }
  }

  /**
   * Displays the results of the current turn.
   *
   * @param {Object} gameState - Game state object from the server.
   */
  function displayTurnResults(gameState) {
    id("results-container").classList.remove("hidden");
    id("p1-turn-results").classList.remove("hidden");
    id("p2-turn-results").classList.remove("hidden");
    id("p1-turn-results").textContent = "Player 1 played " +
    gameState.results["p1-move"] + " and " + gameState.results["p1-result"];

    if (gameState.results["p2-move"] !== null && gameState.results["p2-result"] !== null) {
      id("p2-turn-results").textContent = "Player 2 played " +
      gameState.results["p2-move"] + " and " + gameState.results["p2-result"];
    } else {
      id("p2-turn-results").textContent = "";
    }
  }

  /**
   * Handles the end of the game, updating the UI and disabling buttons.
   *
   * @param {Object} gameState - Game state object from the server.
   */
  function handleEndOfGame(gameState) {
    let moveButtons = qsa("#p1 .moves button");
    for (let button of moveButtons) {
      button.disabled = true;
    }
    if (gameState.p1["current-hp"] === 0) {
      qs("h1").textContent = "You lost!";
    } else {
      qs("h1").textContent = "You won!";
      unlockNewPokemon(gameState.p2.shortname);

    }
    id("flee-btn").classList.add("hidden");
    id("endgame").classList.remove("hidden");
  }

  /**
   * Unlocks a new Pokemon for the player's Pokedex.
   *
   * @param {string} pokemonId - ID of the Pokemon to be unlocked.
   */
  function unlockNewPokemon(pokemonId) {
    let pokemonSprite = id(pokemonId);
    if (!pokemonSprite.classList.contains("found")) {
      pokemonSprite.classList.add("found");
      pokemonSprite.addEventListener("click", function() {
        fetchPokemonInfo(this);
      });
    }
  }

  /**
   * Checks the status of the response from the fetch request.
   * If the response is not ok, it throws an error with the response text.
   *
   * @param {Response} res - The response object from the fetch request.
   * @returns {Response} - The same response object if the status is ok.
   * @throws {Error} - If the response status is not ok, an error is
   * thrown with the response text.
   */
  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text);
    }
    return res;
  }

  /**
   * Finds the element with the specified ID attribute.
   *
   * @param {string} id - element ID
   * @returns {HTMLElement} DOM object associated with id.
   */
  function id(id) {
    return document.getElementById(id);
  }

  /**
   * Finds the first element matching the selector
   *
   * @param {string} selector - CSS selector
   * @returns {HTMLElement} - the first element matching the selector
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * Finds the all of elements matching the selector
   *
   * @param {string} selector - CSS selector
   * @returns {HTMLElement} - all of elements matching the selector
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * This function creates a new HTML element with the specified tag name.
   *
   * @param {string} tagName - The tag name of the HTML
   * @returns {HTMLElement} - A new HTML element with the tag name specified
   * by the tagName parameter.
   */
  function gen(tagName) {
    return document.createElement(tagName);
  }
})();
