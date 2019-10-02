import * as firebase from "firebase/app";
import "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyD6LAJWBNunFYcRK1R-u-OoooJYnyFEAmU",
    authDomain: "backend-for-recipes-01.firebaseapp.com",
    databaseURL: "https://backend-for-recipes-01.firebaseio.com",
    projectId: "backend-for-recipes-01",
    storageBucket: "backend-for-recipes-01.appspot.com",
    messagingSenderId: "805270826332",
    appId: "1:805270826332:web:9805643c9476d41817a599"
};

firebase.initializeApp(firebaseConfig);


const uploadProgressBar = document.getElementById('upload-progress-bar');
const fileButton = document.getElementById('fileButton');
const uploadButton = document.querySelector('.upload-button');
const uploadUrl = document.querySelector('.upload-url');

fileButton.addEventListener('change', e => {
    // Get file
    const file = e.target.files[0];

    // Create storage ref
    const date = new Date();
    const storageRef = firebase.storage().ref(`images-for-recipes/id/${date.getTime()}`);


    // Upload file
    uploadButton.addEventListener('click', e => {
        const task = storageRef.put(file);

        // Update progress bar
        task.on('state_changed', snapshot => {
            const percentage = snapshot.bytesTransferred / snapshot.totalBytes * 100;
            uploadProgressBar.value = percentage;
        }, error => {
            console.error(error);
        }, () => {
            storageRef.getDownloadURL().then(url => {
                uploadUrl.href = url;
                uploadUrl.textContent = "Ссылка на скачивание";
            })
        })
    })

})