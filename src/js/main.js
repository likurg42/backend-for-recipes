import * as firebase from 'firebase/app';
import 'firebase/storage';

import Choices from 'choices.js';

// import MultipleInput from './libs/multiple-input';

const { storage } = firebase;

const firebaseConfig = {
    apiKey: 'AIzaSyD6LAJWBNunFYcRK1R-u-OoooJYnyFEAmU',
    authDomain: 'backend-for-recipes-01.firebaseapp.com',
    databaseURL: 'https://backend-for-recipes-01.firebaseio.com',
    projectId: 'backend-for-recipes-01',
    storageBucket: 'backend-for-recipes-01.appspot.com',
    messagingSenderId: '805270826332',
    appId: '1:805270826332:web:9805643c9476d41817a599',
};

firebase.initializeApp(firebaseConfig);

if (document.querySelector('.firestore-test')) {
    const uploadProgressBar = document.querySelector('.firestore-test__progress');
    const fileButton = document.querySelector('.firestore-test__file-button');
    const uploadButton = document.querySelector('.firestore-test__upload-button');
    const uploadUrl = document.querySelector('.firestore-test__upload-url');

    fileButton.addEventListener('change', (e) => {
        // Get file
        const file = e.target.files[0];
        // Create storage ref
        const date = new Date();
        const storageRef = storage().ref(`images-for-recipes/id/${date.getTime()}`);
        // Upload file
        uploadButton.addEventListener('click', () => {
            const task = storageRef.put(file);
            // Update progress bar
            task.on(
                'state_changed',
                (snapshot) => {
                    const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    uploadProgressBar.value = percentage;
                },
                (error) => {
                    console.error(error);
                },
                () => {
                    storageRef.getDownloadURL().then((url) => {
                        uploadUrl.href = url;
                        uploadUrl.textContent = 'Ссылка на скачивание';
                    });
                },
            );
        });
    });
}

if (document.querySelector('.recipe-form')) {
    const recipeForm = document.querySelector('.recipe-form');

    recipeForm.addEventListener('submit', (e) => {
        e.preventDefault();
    });

    const mealCategories = [
        { value: 'Завтрак', label: 'Завтрак' },
        { value: 'Обед', label: 'Обед' },
        { value: 'Полдник', label: 'Полдник' },
        { value: 'Ужин', label: 'Ужин' },
    ];

    const recipeCategoriesChoices = new Choices('.recipe-form__input--multiple', {
        addItems: true,
        removeItems: true,
        removeItemButton: true,
        editItems: true,
        searchEnabled: true,
        choices: mealCategories,
    });

    const htmlToElement = (html) => {
        const template = document.createElement('template');
        const trimmedHTML = html.trim();
        template.innerHTML = trimmedHTML;
        return template.content.firstChild;
    };

    const createStepHTML = (pos) => {
        return `<fieldset class="recipe-form__step">
                    <legend class="recipe-form__step-header">Шаг 1</legend>
                    <div class="recipe-form__item"><label class="recipe-form__label"
                               for="stepDescription">Описание шага</label><textarea class="recipe-form__input recipe-form__input--big"
                                  name="stepDescription"
                                  id="stepDescription"></textarea></div>
                    <div class="recipe-form__item"><label class="recipe-form__label">Картинка к шагу</label><input class="recipe-form__input recipe-form__input--file"
                               type="file"
                               name="stepPreviewImg"
                               id="stepPreviewImg"><label for="stepPreviewImg">Выбрать файл</label><img class="recipe-form__preview-image"></div>
                    <div class="wrapper wrapper-timer">
                        <div class="wrapper-timer__item wrapper-timer__item--time">
                            <div class="recipe-form__item"><label class="recipe-form__label"
                                       for="stepTimer">Таймер</label><input class="recipe-form__input"
                                       name="stepTimer"
                                       id="stepTimer"></div>
                        </div>
                        <div class="wrapper-timer__item">
                            <div class="recipe-form__item wrapper-timer__format"><label class="recipe-form__label"
                                       for="stepTimerUnit">Формат</label><select class="recipe-form__input"
                                        name="stepTimerUnit"
                                        id="stepTimerUnit">
                                    <option>с.</option>
                                    <option>м.</option>
                                    <option>ч.</option>
                                </select></div>
                        </div>
                    </div><button class="recipe-form__button recipe-form__button--delete">Удалить шаг</button>
                </fieldset>`;
    };

    const createIngredientHTML = (pos) => {
        return ` <div class="wrapper wrapper-ingredient">
                    <div class="wrapper-ingredient__item wrapper-ingredient__item--name">
                        <div class="recipe-form__item"><label class="recipe-form__label"
                                   for="ingredientName">Название</label><input class="recipe-form__input"
                                   id="ingredientName"
                                   name="ingredientName"></div>
                    </div>
                    <div class="wrapper-ingredient__item wrapper-ingredient__item--amount">
                        <div class="recipe-form__item"><label class="recipe-form__label"
                                   for="ingredientAmount">Объем</label><input class="recipe-form__input"
                                   id="ingredientAmount"
                                   name="ingredientAmount"></div>
                    </div>
                    <div class="wrapper-ingredient__item wrapper-ingredient__item--unit">
                        <div class="recipe-form__iterm"><label class="recipe-form__label"
                                   for="ingredientUnit">Тип</label><select class="recipe-form__input"
                                    id="ingredientUnit"
                                    name="ingredientUnit">
                                <option>мл.</option>
                                <option>л.</option>
                                <option>мг.</option>
                                <option>г.</option>
                                <option>кг.</option>
                                <option>ложка</option>
                                <option>стакан</option>
                            </select></div>
                    </div>
                    <div class="wrapper-ingredient__item wrapper-ingredient__item--button"><button class="recipe-form__button recipe-form__button--delete recipe-form__button--delete-small wrapper-ingredient__button"></button></div>
                </div>`;
    };

    const countElements = (query) => {
        const elements = document.querySelectorAll(query);
        return elements.length ? elements.length : 0;
    };

    const updateStepHeaders = () => {
        const steps = document.querySelectorAll('.recipe-form__step');

        steps.forEach((step, index) => {
            const header = step.querySelector('.recipe-form__step-header');
            console.log(header);
            header.innerHTML = `Шаг ${index + 1}`;
        });
    };
    const removeElement = (element) => {
        element.remove();
    };

    const addRemoveButtonFunc = (element) => {
        element.addEventListener('click', (event) => {
            const deleteButton = event.target.closest('.recipe-form__button--delete');
            if (element.contains(deleteButton) && deleteButton) {
                removeElement(element);
                updateStepHeaders();
            }
        });
    };

    recipeForm.addEventListener('click', (e) => {
        const addStepButton = e.target.closest('.recipe-form__button--add-step');

        if (recipeForm.contains(addStepButton) && addStepButton) {
            const addStepButtonParent = addStepButton.parentNode;
            const newStepNumber = countElements();
            const newStep = htmlToElement(createStepHTML(newStepNumber + 1));
            addRemoveButtonFunc(newStep);
            addStepButtonParent.insertBefore(newStep, addStepButton);
            updateStepHeaders();
        }
    });

    recipeForm.addEventListener('click', (e) => {
        const addIngredientButton = e.target.closest('.recipe-form__button--add-ingredient');

        if (recipeForm.contains(addIngredientButton) && addIngredientButton) {
            const addIngredientButtonParent = addIngredientButton.parentNode;
            const newIngredientNumber = countElements('.wrapper-ingredient');
            const newIngredient = htmlToElement(createIngredientHTML(newIngredientNumber));
            console.log(addIngredientButton, addIngredientButtonParent);
            addRemoveButtonFunc(newIngredient);
            addIngredientButtonParent.insertBefore(newIngredient, addIngredientButton);
        }
    });

    const addStepButton = document.querySelector('.recipe-form__button--add-step');
    const newStepNumber = countElements('.recipe-form__step') + 1;
    const newStep = htmlToElement(createStepHTML(newStepNumber));
    addRemoveButtonFunc(newStep);
    const addStepButtonParent = addStepButton.parentNode;
    addStepButtonParent.insertBefore(newStep, addStepButton);

    const addIngredientButton = document.querySelector('.recipe-form__button--add-ingredient');
    const newIngredientNumber = countElements('.wrapper-ingredient');
    const newIngredient = htmlToElement(createIngredientHTML(newIngredientNumber));
    addRemoveButtonFunc(newIngredient);
    const addIngredientButtonParent = addIngredientButton.parentNode;
    addIngredientButtonParent.insertBefore(newIngredient, addIngredientButton);
}
