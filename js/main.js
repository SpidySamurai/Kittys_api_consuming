(() => {
  const CAT_API_BASE_URL = "https://api.thecatapi.com/v1/";
  const API_KEY = "8b8d2f7c-74e4-47cd-83c2-b03ee2c82027";
  const RANDOM_LIMIT = 4;

  const buildHeaders = (customHeaders = {}) => {
    const headers = new Headers(customHeaders);
    if (!headers.has("X-API-KEY")) {
      headers.set("X-API-KEY", API_KEY);
    }
    return headers;
  };

  const request = async (endpoint, options = {}) => {
    const headers = buildHeaders(options.headers || {});
    const config = { ...options, headers };
    const response = await fetch(`${CAT_API_BASE_URL}${endpoint}`, config);

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      const message = payload?.message || "TheCatAPI request failed";
      const apiError = new Error(message);
      apiError.status = response.status;
      apiError.payload = payload;
      throw apiError;
    }

    return payload;
  };

  const CatAPI = {
    getRandomCats: () =>
      request(`images/search?limit=${RANDOM_LIMIT}&api_key=${API_KEY}`),
    getFavoriteCats: () => request("favourites"),
    saveFavoriteCat: (imageId) =>
      request("favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imageId }),
      }),
    deleteFavoriteCat: (favoriteId) =>
      request(`favourites/${favoriteId}`, {
        method: "DELETE",
      }),
    getUploadedCats: () => request(`images/?limit=${RANDOM_LIMIT}`),
    deleteUploadedCat: (imageId) =>
      request(`images/${imageId}`, {
        method: "DELETE",
      }),
    getBreeds: () => request("breeds"),
  };

  const setStatusMessage = (node, message = "") => {
    if (node) {
      node.textContent = message;
    }
  };

  const setBusyState = (element, isBusy) => {
    if (element) {
      element.setAttribute("aria-busy", String(Boolean(isBusy)));
    }
  };

  const clearNode = (node) => {
    if (!node) return;
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  };

  const createCatCard = ({ id, imageUrl, actionLabel, onAction }) => {
    const article = document.createElement("article");
    article.className = "catCard";

    const media = document.createElement("div");
    media.className = "catCard__media";

    const img = document.createElement("img");
    img.width = 350;
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = "Photo of a cat";
    img.src = imageUrl;

    media.appendChild(img);

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = actionLabel;
    button.addEventListener("click", () => onAction(id));

    article.append(media, button);
    return article;
  };

  const renderCatCards = (container, cats, options) => {
    if (!container) return;
    clearNode(container);

    if (!Array.isArray(cats) || cats.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "emptyState";
      emptyState.textContent = options?.emptyMessage || "No cats available yet.";
      container.appendChild(emptyState);
      return;
    }

    cats
      .map((cat) =>
        createCatCard({
          id: cat.id,
          imageUrl: cat.image?.url ?? cat.url,
          actionLabel: options.actionLabel,
          onAction: options.onAction,
        })
      )
      .forEach((card) => container.appendChild(card));
  };

  const injectFragment = async (placeholder) => {
    const url = placeholder?.dataset?.fragment;
    if (!url) return;

    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const markup = await response.text();
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      placeholder.replaceWith(template.content);
    } catch (error) {
      // Fail silently to keep the page usable if the fragment cannot be fetched.
    }
  };

  const highlightActiveNav = () => {
    const navLinks = document.querySelectorAll(".navLinks a[href]");
    if (!navLinks.length) return;
    const current = window.location.pathname.split("/").pop() || "index.html";

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("http")) return;
      const normalized = href.replace("./", "");
      if (normalized === current) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const loadFragments = async () => {
    const placeholders = document.querySelectorAll("[data-fragment]");
    if (!placeholders.length) return;
    await Promise.all(Array.from(placeholders).map((node) => injectFragment(node)));
    highlightActiveNav();
  };

  const initializeCatsApp = () => {
    const randomCatsContainer = document.querySelector(".randomCats__cards");
    const favouriteCatsContainer = document.querySelector(".favouriteCats__cards");
    const refreshButton = document.querySelector('[data-action="refresh-random"]');
    const uploadForm = document.getElementById("uploadCatForm");
    const statusNode = document.getElementById("error");

    const handleError = (message) => setStatusMessage(statusNode, message);

    // Only run home page logic if containers exist
    if (randomCatsContainer && favouriteCatsContainer) {
      const loadRandomCats = async () => {
        setBusyState(randomCatsContainer, true);
        try {
          const cats = await CatAPI.getRandomCats();
          renderCatCards(randomCatsContainer, cats, {
            actionLabel: "Save in favorites",
            onAction: async (imageId) => {
              try {
                await CatAPI.saveFavoriteCat(imageId);
                await loadFavouriteCats();
                handleError("Cat saved to favorites.");
              } catch (error) {
                handleError("Unable to save to favorites.");
              }
            },
          });
          handleError("");
        } catch (error) {
          handleError("Unable to load random cats. Please try again.");
        } finally {
          setBusyState(randomCatsContainer, false);
        }
      };

      const loadFavouriteCats = async () => {
        setBusyState(favouriteCatsContainer, true);
        try {
          const cats = await CatAPI.getFavoriteCats();
          renderCatCards(favouriteCatsContainer, cats, {
            actionLabel: "Remove from favorites",
            emptyMessage: "No favorite cats yet.",
            onAction: async (favoriteId) => {
              try {
                await CatAPI.deleteFavoriteCat(favoriteId);
                await loadFavouriteCats();
                handleError("Cat removed from favorites.");
              } catch (error) {
                handleError("Unable to remove from favorites.");
              }
            },
          });
        } catch (error) {
          handleError("Unable to load favorite cats.");
        } finally {
          setBusyState(favouriteCatsContainer, false);
        }
      };

      const handleRefreshClick = async () => {
        if (refreshButton) {
          refreshButton.disabled = true;
        }
        await loadRandomCats();
        if (refreshButton) {
          refreshButton.disabled = false;
        }
      };

      const handleUpload = async (event) => {
        event.preventDefault();
        if (!uploadForm) return;
        const formData = new FormData(uploadForm);
        const file = formData.get("file");
        if (!file || !file.size) {
          handleError("Please choose a photo before uploading.");
          return;
        }

        setBusyState(uploadForm, true);
        try {
          await CatAPI.uploadCatPhoto(formData);
          uploadForm.reset();
          await loadUploadedCats();
          handleError("Cat uploaded successfully.");
        } catch (error) {
          handleError("Unable to upload the cat photo.");
        } finally {
          setBusyState(uploadForm, false);
        }
      };

      const loadUploadedCats = async () => {
        const uploadedContainer = document.querySelector(".uploadedCats__cards");
        if (!uploadedContainer) return;

        setBusyState(uploadedContainer, true);
        try {
          const cats = await CatAPI.getUploadedCats();
          renderCatCards(uploadedContainer, cats, {
            actionLabel: "Delete Upload",
            emptyMessage: "You haven't uploaded any cats yet.",
            onAction: async (id) => {
              if (!confirm("Are you sure you want to delete this upload?")) return;
              
              try {
                await CatAPI.deleteUploadedCat(id);
                await loadUploadedCats();
                handleError("Cat upload deleted.");
              } catch (error) {
                console.error(error);
                handleError("Unable to delete upload.");
              }
            }
          });
        } catch (error) {
          console.error(error);
          handleError("Unable to load uploaded cats.");
        } finally {
          setBusyState(uploadedContainer, false);
        }
      };

      if (refreshButton) {
        refreshButton.addEventListener("click", handleRefreshClick);
      }

      if (uploadForm) {
        uploadForm.addEventListener("submit", handleUpload);
      }

      loadRandomCats();
      loadFavouriteCats();
      loadUploadedCats();
    }
  };

  const initializeBreedsApp = async () => {
    const breedSelector = document.getElementById("breedSelector");
    const breedContainer = document.getElementById("breedsContainer");
    
    if (!breedSelector || !breedContainer) return;

    let breeds = [];

    const updateBreedDetail = (breedId) => {
      const breed = breeds.find(b => b.id === breedId);
      const detail = document.getElementById("breedDetail");
      const placeholder = document.getElementById("breedPlaceholder");
      const img = document.getElementById("breedImage");

      if (!breed) {
        detail.hidden = true;
        placeholder.hidden = false;
        return;
      }

      placeholder.hidden = true;
      detail.hidden = false;

      // Update Text
      document.getElementById("breedName").textContent = breed.name;
      document.getElementById("breedDescription").textContent = breed.description;
      document.getElementById("breedOrigin").textContent = `🌍 ${breed.origin}`;
      document.getElementById("breedLifeSpan").textContent = `❤️ ${breed.life_span} years`;
      
      const wikiLink = document.getElementById("wikiLink");
      if (breed.wikipedia_url) {
        wikiLink.href = breed.wikipedia_url;
        wikiLink.hidden = false;
      } else {
        wikiLink.hidden = true;
      }

      // Update Image (Use specific breed image if available, else API might need separate call, but breeds endpoint usually has image object)
      // Note: Breeds list endpoint might include an image object.
      if (breed.image && breed.image.url) {
        img.src = breed.image.url;
      } else {
        // Fallback or fetch specific image if needed. For now simple check.
        img.src = "https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg"; // Generic fallback just in case
      }

      // Render Stats
      const statsContainer = document.getElementById("breedStats");
      clearNode(statsContainer);
      
      const stats = [
        { label: "Adaptability", value: breed.adaptability },
        { label: "Affection", value: breed.affection_level },
        { label: "Child Friendly", value: breed.child_friendly },
        { label: "Energy Level", value: breed.energy_level },
        { label: "Intelligence", value: breed.intelligence },
        { label: "Social", value: breed.social_needs },
      ];

      stats.forEach(stat => {
        const row = document.createElement("div");
        row.className = "statRow";
        row.innerHTML = `
          <span class="statLabel">${stat.label}</span>
          <div class="statBar">
            <div class="statFill" style="width: ${(stat.value / 5) * 100}%"></div>
          </div>
        `;
        statsContainer.appendChild(row);
      });
    };

    try {
      breeds = await CatAPI.getBreeds();
      
      breeds.forEach(breed => {
        const option = document.createElement("option");
        option.value = breed.id;
        option.textContent = breed.name;
        breedSelector.appendChild(option);
      });

      breedSelector.addEventListener("change", (e) => {
        updateBreedDetail(e.target.value);
      });

    } catch (error) {
      console.error("Failed to fetch breeds", error);
    }
  };

  const ThemeManager = {
    init: () => {
      const toggle = document.getElementById("themeToggle");
      const stored = localStorage.getItem("theme");
      const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      const current = stored || system;

      document.documentElement.setAttribute("data-theme", current);
      ThemeManager.updateButton(toggle, current);

      if (toggle) {
        toggle.addEventListener("click", () => {
          const currentTheme = document.documentElement.getAttribute("data-theme");
          const newTheme = currentTheme === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", newTheme);
          localStorage.setItem("theme", newTheme);
          ThemeManager.updateButton(toggle, newTheme);
        });
      }
    },
    updateButton: (btn, theme) => {
      if (!btn) return;
      btn.textContent = theme === "dark" ? "☀️" : "🌙";
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode");
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    await loadFragments();
    ThemeManager.init();
    initializeCatsApp();
    initializeBreedsApp();
  });
})();
