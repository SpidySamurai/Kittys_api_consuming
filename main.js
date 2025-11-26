const CAT_API = "https://api.thecatapi.com/v1/";
const API_KEY = "8b8d2f7c-74e4-47cd-83c2-b03ee2c82027";
//query parameter, you can request 1, and more data objects

const error = document.getElementById("error");

const createCatArticle = (cat, catImgUrl, onClickAction, onClickActionText) => {
  const catArticle = document.createElement("article");
  catArticle.classList.add("catCard");

  const catMedia = document.createElement("div");
  catMedia.classList.add("catCard__media");

  const catImg = document.createElement("img");
  catImg.width = 350;
  catImg.src = catImgUrl;
  catImg.loading = "lazy";
  catImg.alt = "Photo of a cat";

  catMedia.appendChild(catImg);

  const catBtn = document.createElement("button");
  const btnText = document.createTextNode(onClickActionText);
  catBtn.onclick = () => onClickAction(cat.id);
  catBtn.appendChild(btnText);

  catArticle.appendChild(catMedia);
  catArticle.appendChild(catBtn);

  return catArticle;
};

const loadRandomCats = async () => {
  const response = await fetch(
    `${CAT_API}images/search?limit=4&api_key=${API_KEY}`
  );
  const data = await response.json();

  if (response.status === 200) {
    const favouriteCats = document.querySelector(".randomCats__cards");
    favouriteCats.innerHTML = "";
    data.forEach((cat) => {
      const onClickActionText = "Save in favorites";
      const catArticle = createCatArticle(
        cat,
        cat.url,
        addCatToFav,
        onClickActionText
      );
      favouriteCats.appendChild(catArticle);
    });
  } else {
    error.innerHTML = "There was an error loading random cats: " + response.status;
  }
};

const loadFavouriteCats = async () => {
  const response = await fetch(`${CAT_API}favourites?`, {
    method: "GET",
    headers: {
      "X-API-KEY": API_KEY,
    },
  });
  const data = await response.json();

  if (response.status === 200) {
    const favouriteCats = document.querySelector(".favouriteCats__cards");
    favouriteCats.innerHTML = "";
    data.forEach((cat) => {
      const onClickActionText = "Remove from favorites";
      const catArticle = createCatArticle(
        cat,
        cat.image.url,
        removeCatfromFav,
        onClickActionText
      );

      favouriteCats.appendChild(catArticle);
    });
  } else {
    error.innerHTML = "There was an error loading favorites: " + response.status;
  }
};

const addCatToFav = async (id) => {
  const response = await fetch(`${CAT_API}favourites?`, {
    method: "POST",
    headers: {
      "X-API-KEY": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_id: id,
    }),
  });
  console.log("Cat added to favorites");
  if (response.status !== 200) {
    error.innerHTML = "There was an error saving to favorites: " + response.status;
  } else {
    loadFavouriteCats();
  }
};

const removeCatfromFav = async (id) => {
  const response = await fetch(`${CAT_API}favourites/${id}?`, {
    method: "DELETE",
    headers: {
      "X-API-KEY": API_KEY,
    },
  });
  console.log("Cat removed from favorites");
  if (response.status !== 200) {
    error.innerHTML = "There was an error removing from favorites: " + response.status;
  } else {
    loadFavouriteCats();
  }
};

const uploadCat = async () => {
  const form = document.querySelector(".uploadingForm");
  const formData = new FormData(form);

  console.log(formData.get("file"));

  const response = await fetch(`${CAT_API}images/upload`, {
    method: "POST",
    headers: {
      // "Content-Type": "multipart/form-data",
      "X-API-KEY": API_KEY,
    },
    body: formData,
  });

  const data = await response.json();
  console.log(response.status);
  console.log(data.message);
  // addCatToFav(data.id);
};

loadRandomCats();
loadFavouriteCats();
