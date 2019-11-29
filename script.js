window.onload = function() {
    var div = document.createElement("div");
    var h1 = document.createElement("h1");
    h1.innerText = 'Hello World!';
    document.body.prepend(div);
    div.appendChild(h1);
}