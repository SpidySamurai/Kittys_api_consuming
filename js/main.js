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
    uploadCatPhoto: (formData) =>
      request("images/upload", {
        method: "POST",
        body: formData,
      }),
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

    if (!randomCatsContainer || !favouriteCatsContainer) {
      return; // Not on the home page.
    }

    const handleError = (message) => setStatusMessage(statusNode, message);

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
        handleError("Cat uploaded successfully.");
      } catch (error) {
        handleError("Unable to upload the cat photo.");
      } finally {
        setBusyState(uploadForm, false);
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
  };

  document.addEventListener("DOMContentLoaded", () => {
    loadFragments();
    initializeCatsApp();
  });
})();
