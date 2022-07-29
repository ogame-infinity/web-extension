if (window.location.href.includes("galaxy")) {

    const check = () => {
        if (window.loadContent != undefined) {
            window.loadGalaxy = loadContent;
            loadContent = () => { }
        } else {
            requestAnimationFrame(check);
        }
    };
    requestAnimationFrame(check);

}
if (window.location.href.includes("highscore")) {
    const check = () => {
        if (window.initHighscoreContent != undefined)
        {
            initHighscoreContent = () => { }
        } else {
            requestAnimationFrame(check);
        }
    };
    requestAnimationFrame(check);
}

