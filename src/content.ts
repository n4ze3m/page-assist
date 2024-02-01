export {}
import { Storage } from "@plasmohq/storage"

const storage = new Storage()

// const main = async () => {
//   const isChatWidgetEnabled = await storage.get("chat-widget");
//   var iframe = document.createElement("iframe");
//   iframe.id = "pageassist-iframe";
//   iframe.style.backgroundColor = "white";
//   iframe.style.position = "fixed";
//   iframe.style.top = "0px";
//   iframe.style.right = "0px";
//   iframe.style.zIndex = "9000000000000000000";
//   iframe.style.border = "0px";
//   iframe.style.display = "none";
//   iframe.style.width = "500px";
//   iframe.style.height = "100%";

//   iframe.src = chrome.runtime.getURL("popup.html");

//   document.body.appendChild(iframe);
//   var toggleIcon = document.createElement("div");

//   if (isChatWidgetEnabled) {
//     toggleIcon.style.display = "none";
//   } else {
//     toggleIcon.style.display = "block";
//   }

//   toggleIcon.id = "pageassist-icon";
//   toggleIcon.style.position = "fixed";
//   toggleIcon.style.top = "50%";
//   toggleIcon.style.right = "0px";
//   toggleIcon.style.transform = "translateY(-50%)";
//   toggleIcon.style.zIndex = "9000000000000000000";
//   toggleIcon.style.background = "linear-gradient(to bottom, #0c0d52, #023e8a)";
//   toggleIcon.style.height = "50px";
//   toggleIcon.style.width = "50px";
//   toggleIcon.style.borderTopLeftRadius = "10px";
//   toggleIcon.style.borderBottomLeftRadius = "10px";
//   toggleIcon.style.cursor = "pointer";

//   var iconBackground = document.createElement("div");
//   iconBackground.style.backgroundRepeat = "no-repeat";
//   iconBackground.style.backgroundSize = "contain";
//   iconBackground.style.height = "100%";
//   iconBackground.style.backgroundImage =
//     "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAQAAACTbf5ZAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAB3RJTUUH5gcFDDQINdz8vAAAAAJiS0dEAP+Hj8y/AAAKmklEQVR42u2ceXCU5R3Hv++72evd7ObYHJvDJGbZ3AdJCAmHWosEhKGCAuGQoC1XPJjWFhG5RJ0600qxHTuCHAmHwgyIoOPYIir0D61EiJUOGgNKolxKEJFCAsl++8f77hLJ4SLv7r7E/ea/vMPk+fB7jt/1PEBIIYUUUkghhRRSSCGFFFJIIYUUUkgh+aonsUK8y5wWMTCp1FnoKnSVOsuS0iPGmteJf+pLmONwv5hnTymOmxK9TKq1vq2vMzVIzebj5uNSs6lBX2d921JrX+aYnFYywD5XnHTjghISKvRprpgq2xpTfViL2CEQPfwIFNv1Z8z1tnWO6RkZ4/Q3gzcW7IPYI+TEx1eGbzE0ie3dAlJkd/8BYrux2bbFMbnIcV546saAHY1FQpoz6jFTva7tCoiOduZxFGdxKZ/jGm7gBq7hc1zCmRzFPNqp64StuyR9FLsg07lQ+JW2YasAOFMjlxgaBbdn8FaW8mFu5AF+zVZ2p1ae4gFu4kMcQOsVW7tNh2OW5KYCj2h1zUahwGafZTzogTWwkAv4Ls/QTV/kZgv38DEWUO+FNh90zCq3xWlvTQ/HeiG51LJTVKaxxBHcyJM+ov4Q+wQ3soKSZ3q3WXeml/5bmKgl3EwUSfYHDM3yEI2s4HZ+z+vROW7ncBoUaGNzfPVQqUgbsE/ACleidZWuVR5cHtfwLNXQt1zNHI+dWyNX5SfasS7YuPMApORKb8nr1sI5PEw11chZtMhHmTt8V0Yu8Hwwce8AcNMg0wHZCunc0MM+fD26yFrerJze0oH0cmBcsHBvA5B4i+mQjHsLP6C/9AGHKlPbfCjtFuCuYODeDiB5kIwrcjyP0p/6gncrnpn5kLMcGB94f8qKm3Llyazjffya/tYpVlGUj7z9GbnRmB1YJyMJrkTpLdm697GFgdBpTqNAUKD1nwUJzkA6I7kol6yr5Ck2PgDW9egkxynbV9TKUeayQOH+EkD0A/K5eyu/YCD1ubJ9hbU6qoGpgcB9GRYkD5S9Kif3MdB6XzmkjE3OUhv+Fwg3ssBm2Sm7GRsYDNUofrbt1SE2v7ubkwDYZ4uXQLDaD26Gb67ITCWscMz0e/B4E9LTjAdBMF9lJ/Ja1KD42NLHeakZ/sQdCiByiUDQwLUMplZRT1BkzCK/+l1JSHUZGkFwhEoR0U+PpO4gCJo+y3Q6/elMRi0QCEp8lcHWNpoJioydD0zwD7ALWQ5TPQiOvM7wXg19p9hYOjAgvtAfuM9AQOwk8RKo5yZqQbUMI6hrS64UsVd94DLco7dsAcH+PKEJ4GPMJwhGbH5UP1p94GSkZuibQPBxakWPyj7X0SyX6ofTIwDs08UO0Ma9mgF+m+EEde2J00SsURd4DD4RwteC4ECe0QzwaZYQBKNWU5ijLnAe8mLkHXoutaQHlJTAYPsgdYEdSC4JawF1fElTwOspEjS09CtOVRfYjJgpYgcYw3pNAX/IaIK69qRJVrW3rcgnBYL5Acxv+JYDySEoMHapqrBTQcG8HgRHs01TwBc5Uq5R1lBYpmaUVGEOfwcEZ1Nr+o3sfOyeZh6rHnACEiLC6kDwCZ8GcYn13Mo9/K6H7818ja+xucdC2h5uZT0v+fS3Fsml2X1Ztkz1gIvRP8n4GQj+zadptoxxFGnhBDZ18/1NFlBPPQv4ZjdfmziBFoqM4zJe8OGv/UUOEz8dmniresBF6O80fwkKPoX9W721XXAuO7pYt9D7tbCLlTs41/tV4lafUgEgaGkamq4icA6yXabjoMiNPgxhdqdujXyeuurr696qL2jg613qC/md/rUvO0YNBYLSsYEuFfPU2cjKkIE3XTPw1zcicBEKlSm97ucxpUtQlByoTav5Gjet5f7YtFKRGqn/8NqOpW29Hkuv/8ixtO0ajyWjusfSFcdjzs/D8ajCRUHSqGs5wh+uZaVmg4cT/gkeKmH6uYWHWk0A1MoJgNP9ilROAOQhL8aowRRPtZLiGRI9WF3gu3BGsCpJvBbN4J5msTeJ95C6wNUAYpQ07R7NAO/2pml1qFW/MuxJxC/QDPA8JRGf3S8TqqscE/WWzZostbz8eNgY9YGXQ/QW0zZqZIeWi2lJE3Wo90f90IlMh9x7N4LntFMu3V8a76fWlmGdCuLbgw68VSmIx82XPUE/tbSk9ZPDxAp+G1TcMxwmh4UN2c5+fm5qWSw3tawOKvBKpakldhFwtz/7eFLgTDX+BwRz2Rg03AZmy+v3Iz+3LSmNaTPluyuzf9CYdplf8j2+wTdZx1NdEjvqhoSexrSEGcB8f/fiZaDAZtkBghH8lzKEC3yD0+iilUYaGckCzuX7vOwn4LWe1sPtt1pL/N9r+RosSC41HgUjlF6ARk5neJdbhLFcyG/8gPse0xT/ylkaEZie6WEgRv166vlVbCVZzzIvpJmxtHvTsCLH85jKuEc4WG4fvuiYE6D2YQBww21wr6CbPMohCl4/Ps5dPMiPuIOzGa/8tkpVF+Ukx3oaxF8YbS5HAOWGO4HvXubDii3v4Sedrt21c69idwNfUDEYvDdYVwCAyyBY9s7hOILgmC4FFfJjxbXvr9K0Psl7vZc8MnOiMQsB1lJQSFstEEzooS/+JZoI6vmyCrifc5xyjUc65CzzozPZq8KxBwSns73bQbYo07r6unHf9+4U5kNpQ4N0UQtACj4HwRd7HKjcVDScF6/LzahRDiKB0n5nGTAZwVIWToBh3NnjYJ8kCJb3WHL5cX3GmYqbIbituzJygBoET058BYq9rNHHKF/1+WnNxt/yRcVnBnUXo1YWJkRhB4IpO+p7azZt5RiC4KQe1nhvOsdXOOzKhekmx5xfmEsQZAki1oNgSQ85rn2UD61nrwnVzePcwOGdrsTbXk0f0CRUQguaiDZQx6e6iY7OcQpB0OFzccbNFr7L+czv/OjBx44Zg6ypmnn0IBrvgGAUV15VVTzLecqwq3mZ5AUe5slenrXYzw18kCWdghDRbWqMXZybAvxOI7AQAaACp0AwnLP4Ac+xnZfZwn9wjIJbyE9JXuBvmcwcjuQMLuYKruZ6rudqruBizuCdzGX0Dx8uaZPqY+dnO5/V1tsOgABBxByclYdp5xBO4DgWe+0kndxxhG1kAxOvfoJGcRO7eZqmKWJzYmVx/Hks1QilHvFIQZRsYABhqMIX3QzejTrzHUzleP71m/duOyG09/b4kK5d3yIdiFyTMC3LVakv0MyaNWIMtuC/OII6LEe+19CFWIWv0OFFuIQGPI0UJa4SaHs01zExZml4jW23oc7UIDVLyvNShn223eE19icSJjuLB9nnifdragZb8Ay+72SZwxgbB8Fj52zcjz+jBmvxNCYgxTsDvFqJV8QpZldEeVJ5erGryFWeXp7ktE00bxP+Dm3q92jzTEEF+SgGdl3W6CNyohEEU7iE61hFs4xcgzD0UU1FO2jlK0oM86AMfASpfRV4IQgWe+v/u2giiLMY0FeB/wCCWfzSW8zSE8RpFPZV4DtxAQzjQp5lBz/l7fKUrkdsXwWOxl75tazBvIcuz069BH1YFTh2lY+0Cwl9llaAKGA09sPzbON5bIYTfV5JuA/PoxZ/xAjBghvtwc2QQgoppJBCCimkQOr/ecIE+5d512IAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjItMDctMDVUMTI6NTE6NTkrMDA6MDCsFSHZAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIyLTA3LTA1VDEyOjUxOjU5KzAwOjAw3UiZZQAAAABJRU5ErkJggg==')";
//   iconBackground.style.width = "100%";
//   iconBackground.style.opacity = "0.7";
//   iconBackground.style.position = "absolute";
//   iconBackground.style.top = "0";
//   iconBackground.style.left = "0";

//   toggleIcon.appendChild(iconBackground);
//   toggleIcon.addEventListener("click", function () {
//     if (iframe.style.display === "none") {
//       iframe.style.display = "block";
//       toggleIcon.style.display = "none";
//       toggleIcon.classList.add("hidden");
//     } else {
//       iframe.style.display = "none";
//       toggleIcon.classList.remove("hidden");
//     }
//   });

//   document.body.appendChild(toggleIcon);

//   // iframe.addEventListener("load", function () {
//   //   var closeButton = iframe.contentDocument.createElement("button");
//   //   closeButton.innerText = "Close";
//   //   closeButton.style.position = "fixed";
//   //   closeButton.style.top = "20px";
//   //   closeButton.style.right = "20px";
//   //   closeButton.addEventListener("click", function () {
//   //     toggleIcon.classList.remove("hidden");
//   //     iframe.style.display = "none";
//   //   });
//   //   iframe.contentDocument.body.appendChild(closeButton);
//   // });

//   window.addEventListener("message", function (event) {
//     if (event.data === "pageassist-close") {
//       iframe.style.display = "none";
//       if (!isChatWidgetEnabled) {
//         toggleIcon.style.display = "block";
//         toggleIcon.classList.remove("hidden");
//       }
//     } else if (event.data === "pageassist-html") {
//       console.log("pageassist-html");
//       let html = document.documentElement.outerHTML;
//       let url = window.location.href;

//       iframe.contentWindow.postMessage({
//         type: "pageassist-html",
//         html: html,
//         url: url,
//       }, "*");
//     }
//   });
// };

const sidePanelController = async () => {
  // get sidepanel open or close command from storage else Ctrl+0
  const sidepanelCommand = await storage.get("sidepanel-command")
  const command = sidepanelCommand || "Ctrl+0"

  // listen to keydown event
  document.addEventListener("keydown", (event) => {
    let pressedKey = ""
    if (event.ctrlKey) {
      pressedKey += "Ctrl+"
    }

    if (event.shiftKey) {
      pressedKey += "Shift+"
    }

    pressedKey += event.key

    console.log(pressedKey)

    if (pressedKey === command) {
      // send a message to background.js to open or close sidepanel
      chrome.runtime.sendMessage({ type: "sidepanel" })
    }
  })
}

sidePanelController()
