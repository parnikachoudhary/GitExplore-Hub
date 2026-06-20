const searchBtn = document.querySelector(".search-btn");
const parent = document.querySelector(".search-results"); 
const themeBtn = document.querySelector(".theme-toggle-btn");
let page = 1;
let currentQuery = ""; 
let mode = "";


//===================================================
// STATE DEFINED
//===================================================
let currentResults = [];
let favorites = [];
let recentSearches = [];

//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// LOAD STATE 
//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
function loadState(){
    favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    recentSearches = JSON.parse(localStorage.getItem("user")) || [];
}

loadState();

//===================================================
// THEME
//===================================================
function setTheme(themeName){
    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("theme", themeName);
    }
//===================================================
    themeBtn.addEventListener('click', function(){
        const currentTheme = document.documentElement.getAttribute("data-theme");

            if(currentTheme === "dark"){
                setTheme("light");
                
            }
            else{
                setTheme("dark");
            }    
    });
//===================================================
function initializeTheme(){
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
}

initializeTheme();

//===================================================
// SAVE DATA (USERS) TO LOCAL STORAGE
//===================================================
function saveUsers(currentQuery){
    const getUsers = JSON.parse(localStorage.getItem("user")) || [];

    // avoiding duplicates
    if(!getUsers.includes(currentQuery)){
        getUsers.push(currentQuery);
        
    }
    localStorage.setItem("user", JSON.stringify(getUsers));    
}


//===================================================
// SAVE Favorite user
//===================================================
function saveFavorite(userData){

    const exists = favorites.some(function(user){
        return user.login === userData.login; // extract login(userData.login) from the state(user.login)
    })
    
    // AVOIDING DUPLICATE ENTERIES INTO LOCAL STORAGE
    if(!exists){ 
        favorites.push(userData); // pushed in defined state
    }
    
    localStorage.setItem("favorites", JSON.stringify(favorites));// saved to local storage
}

//===================================================
// RECENT SEARCHES
//===================================================
function showRecentSearch(){
    loadState();
    const recentBox = document.querySelector(".recent-search");
    recentBox.innerHTML = "";
    recentSearches.slice(-3).reverse().forEach (function(user){
        const item = document.createElement("div");

        const cleanUsername = user.split('+')[0].split('&')[0];
        item.textContent = `‣ ${cleanUsername}`;
        
        item.addEventListener('click', function(){
            document.querySelector(".user-input").value = user; // click functionality
            handleFreshStart();
        });

        recentBox.appendChild(item);

    });
}

//===================================================
// PLACEHOLDER SETTINGS
//===================================================
const appMode = document.querySelector(".app-mode");

// creating a placeholder object, mapping the options to placeholder text
const placeholders = {
    users: "Enter a Github username...(e.g, octacat)",
    teammate: "Enter TechStack Location...(e.g., javascript india)",
    opensource: "Enter issue keyword...(e.g., documentation)"
}

appMode.addEventListener("change", function(){
    const selectMode = appMode.value;
    document.querySelector(".user-input").placeholder = placeholders[selectMode] || "Enter...";
})


//===================================================
// FETCH DATA - API CALL
//===================================================
async function searchUsers(){
    parent.innerHTML = `<p>Loading...</p>`;

    mode = document.querySelector(".app-mode").value;
    const rawInput = document.querySelector(".user-input").value.trim();

    if(rawInput === ""){
        parent.innerHTML = `<p>Please enter a search query</p>`;
        return;
    }

    let url = "";

        //===================================================
        // MODE ROUTER SYSTEM
        //===================================================
        if(mode === "teammate"){
            const parts = rawInput.split(" "); // expects fastapi india
            const techStack = parts[0];
            const location = parts[1] || "";
            currentQuery = rawInput;
            

            url = `https://api.github.com/search/users?q=language:${techStack}+location:${location}&page=${page}`;
        }

        else if(mode === "opensource"){
            currentQuery = rawInput;
            url = `https://api.github.com/search/issues?q=${rawInput}+label:"good+first+issue"+state:open&page=${page}`;
        }

        else{
            let apiQuery = rawInput;
            const dates = document.querySelector(".date-filter").value;
            if(dates){
                apiQuery += `+created:>${dates}`;
            }

            url = `https://api.github.com/search/users?q=${apiQuery}&page=${page}`;
            
        }
        try{
        const response = await fetch(url);
        const data = await response.json();
        if(!response.ok) throw new Error("API Limit or Request Error");

        saveUsers(rawInput); // save into localStorage
        
        currentResults = data.items || []; // currentResults is an array of objects

        // NOTHING RECEIVED
        if(currentResults.length === 0){
            parent.innerHTML = `<p>No users found</p>`;
            return;
        }
        // RENDER 
        renderCards();  
        showRecentSearch();
    }
    catch(error){
        parent.innerHTML = `<p>Network error</p>`;
    } 
}

//===================================================
// User Card creation - STANDARD AND TEAMMATES mode
//===================================================
function createUserCard(user){

    const card = document.createElement("div");
    card.classList.add("profile-card");

    const btn = document.createElement("button");
    btn.classList.add("view-profile-btn");
    btn.textContent = "Explore Profile";

    const alreadyFavorite = isFavorite(user.login);

    const favBtn = document.createElement("button");
    favBtn.classList.add("fav-btn");
    favBtn.textContent = alreadyFavorite ? "★Added" : "✨Favorite";


    const favoriteUser = {
        login: user.login,
        avatar_url: user.avatar_url,        
    }

    card.innerHTML = `
        <p>Username: ${user.login}</p>
        <img class="image" src = ${user.avatar_url}>
    `;
    
    parent.appendChild(card);
    card.appendChild(btn);
    card.appendChild(favBtn);

    favBtn.addEventListener('click', function(){

        if(isFavorite(favoriteUser.login)){
            return;
        }

        saveFavorite(favoriteUser);
        favBtn.textContent = "★ Added";
        showFavorites();
    });

    btn.addEventListener('click', function(){
        window.open(`profile.html?username=${user.login}`); // new tab opens 
    
    }); 
}

//===================================================
// Issue Card — Open Source mode
//===================================================
function createIssueCard(issue){
    const card = document.createElement("div");
    card.classList.add("profile-card", "issue-card");
 
    // Extract repo name from repository_url: ".../repos/owner/repo"
    const repoParts = issue.repository_url.split("/");
    const repoName = repoParts[repoParts.length - 2] + "/" + repoParts[repoParts.length - 1];
 
    // Format labels as badge spans
    const labelsHTML = issue.labels.map(function(label){
        return `<span class="issue-label" style="background:#${label.color}20; color:#${label.color}; border:1px solid #${label.color}40;">${label.name}</span>`;
    }).join(" ");
 
    card.innerHTML = `
        <div class="issue-repo">📦 ${repoName}</div>
        <p class="issue-title">${issue.title}</p>
        <div class="issue-labels">${labelsHTML}</div>
        <p class="issue-meta">💬 ${issue.comments} comments · #${issue.number}</p>
    `;
 
    const openBtn = document.createElement("button");
    openBtn.classList.add("view-profile-btn");
    openBtn.textContent = "View Issue";
    openBtn.addEventListener('click', function(){
        window.open(issue.html_url);
    });
 
    card.appendChild(openBtn);
    parent.appendChild(card);
}

//===================================================
// RENDER CARDS
//===================================================
function renderCards(){
    // render //
    parent.innerHTML = "";
    const mode = document.querySelector(".app-mode").value;
    if(mode === "opensource"){
        
        currentResults.forEach(function(issue){
            createIssueCard(issue);
        })
    }
    else{
        currentResults.forEach(function(user){
            createUserCard(user);   // calling the function
        });
    }       
}
//===================================================
// SEARCH EVENT LISTENER (click or enter)
//===================================================
searchBtn.addEventListener('click', handleFreshStart);
const inputBox = document.querySelector(".user-input");
inputBox.addEventListener('keydown', function(e){
    if(e.key === "Enter") {
        handleFreshStart();
    }
});

//===================================================
// PAGINATION
//===================================================
document.querySelector(".next-btn").addEventListener('click', function(){
        page ++;
        searchUsers();
        updatePageNumber();
});

document.querySelector(".prev-btn").addEventListener('click', function(){
    if(page > 1){
        page --;
        searchUsers();
        updatePageNumber();
    }    
});

function updatePageNumber(){
    const pageNumber = document.querySelector(".page-number");
    pageNumber.textContent = page;
}
updatePageNumber();

function handleFreshStart(){
    page = 1; 
    updatePageNumber();
    searchUsers();
}

//===================================================
// DELETE FROM LOCAL STORAGE
//===================================================
function deleteLocalStorage(){
    recentSearches = []; // empty the array and then setItem
    localStorage.setItem("user", JSON.stringify(recentSearches));
}

document.querySelector(".delete-search").addEventListener('click', function(){
    deleteLocalStorage();
    showRecentSearch();
});
//===================================================
// SHOW FAVORITES
//===================================================
function showFavorites(){
    const favoriteUser = document.querySelector(".favorite-user");
    favoriteUser.innerHTML = "";

    favorites.forEach(function(fav){
        const item = document.createElement("div");
        const removeBtn = document.createElement("button");
        item.textContent = fav.login;
        item.classList.add("fav-user");

        removeBtn.textContent = "Remove";
        removeBtn.classList.add("remove-fav");
        favoriteUser.appendChild(item);
        favoriteUser.appendChild(removeBtn);

        removeBtn.addEventListener('click', function(){
            favorites = favorites.filter(function(user){ // favorite state
                return user.login != fav.login           // give us new updated state after removing user.login from fav.login
            })
            // after receiving the updated state, we setItem(local storage updation)
            localStorage.setItem("favorites", JSON.stringify(favorites));
            showFavorites();
            renderCards();
        })
    })      
}

showFavorites();
showRecentSearch();

//===================================================
// HELPER TO CHECK FAVORITE OR NOT ??
//===================================================
function isFavorite(login){

    return favorites.some(function(user){
        return user.login === login; // login -> to be tested // user.login -> inside the favorites // and if they match then isFavorite = true;
    })
}


