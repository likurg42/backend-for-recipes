import * as firebase from 'firebase/app';
import 'firebase/storage';

import Choices from 'choices.js';

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

// const testImagePath = 'images-for-recipes-test';

const pathToImages = 'images-for-recipes'; // 'images-for-recipes';

if (document.querySelector('.firestore-test')) {
    const uploadProgressBar = document.querySelector('.firestore-test__progress');
    const fileButton = document.querySelector('.firestore-test__file-button');
    const uploadButton = document.querySelector('.firestore-test__upload-button');
    const uploadUrl = document.querySelector('.firestore-test__upload-url');

    fileButton.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const date = new Date();
        const storageRef = storage().ref(`${pathToImages}/id/${date.getTime()}`);
        uploadButton.addEventListener('click', () => {
            const task = storageRef.put(file);
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
    const infoSection = recipeForm.querySelector('.recipe-form__section--info');
    const ingredientsSection = recipeForm.querySelector('.recipe-form__section--ingredients');
    const stepsSection = recipeForm.querySelector('.recipe-form__section--steps');
    const modalAfterUpload = document.querySelector('.modal-after-upload');
    const modalWindowText = modalAfterUpload.querySelector('.modal-after-upload__text');
    const modalButton = modalAfterUpload.querySelector('.modal-after-upload__button');

    modalButton.addEventListener('click', () => {
        window.scrollTo(0, 0);
        document.location.reload(true);
    });

    const mealCategories = [
        { value: 'Завтрак', label: 'Завтрак' },
        { value: 'Обед', label: 'Обед' },
        { value: 'Полдник', label: 'Полдник' },
        { value: 'Ужин', label: 'Ужин' },
    ];

    const uploadStepImagesTasks = [];
    const uploadPreviewImagesTasks = [];

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

    const modalProgressBar = () => {
        return `<div class="progress">
                    <progress class="modal-after-upload__progress-bar"
                              max="100"
                              value="0">
                    </progress>
                    <div class="progress-value"></div>
                    <div class="progress-bg">
                        <div class="progress-bar"></div>
                    </div>
                </div>`;
    };

    const createStepHTML = (pos) => {
        return `<fieldset class="recipe-form__step">
                    <legend class="recipe-form__step-header">Шаг 1</legend>
                    <div class="recipe-form__item">
                        <label class="recipe-form__label" for="description-${pos}">Описание шага</label>
                        <textarea class="recipe-form__input recipe-form__input--big"
                                  name="description-${pos}"
                                  id="description-${pos}"></textarea>
                    </div>
                    <div class="recipe-form__item">
                        <label class="recipe-form__label">Картинка к шагу</label>
                        <input class="recipe-form__input recipe-form__input--file"
                               type="file"
                               name="imageDownloadUrl-${pos}"
                               id="imageDownloadUrl-${pos}">
                        <label for="imageDownloadUrl-${pos}">Выбрать файл</label>
                        <img class="recipe-form__preview-image recipe-form__preview-image--step-image">
                        <input type="hidden" name="imageAbsolutePath-${pos}">

                    </div>
                    <div class="wrapper wrapper-timer">
                        <div class="wrapper-timer__item wrapper-timer__item--time">
                            <div class="recipe-form__item">
                                <label class="recipe-form__label"
                                       for="timer-${pos}">Таймер</label>
                                <input class="recipe-form__input"
                                       name="timer-${pos}"
                                       id="timer-${pos}">
                            </div>
                        </div>
                        <div class="wrapper-timer__item">
                            <div class="recipe-form__item wrapper-timer__format">
                                <label class="recipe-form__label"
                                       for="timeUnit-${pos}">Формат</label>
                                <select class="recipe-form__input"
                                        name="timeUnit-${pos}"
                                        id="timeUnit-${pos}">
                                    <option disabled selected value></option>
                                    <option>с.</option>
                                    <option>м.</option>
                                    <option>ч.</option>
                                </select>
                            </div>
                        </div>
                    </div><button class="recipe-form__button recipe-form__button--delete" type="button">Удалить шаг</button>
                </fieldset>`;
    };

    const createIngredientHTML = (pos) => {
        return ` <div class="wrapper wrapper-ingredient recipe-form__ingredient">
                    <div class="wrapper-ingredient__item wrapper-ingredient__item--name">
                        <div class="recipe-form__item">
                            <label class="recipe-form__label"
                                   for="name-${pos}">Название</label>
                            <input class="recipe-form__input"
                                   id="name-${pos}"
                                   name="name-${pos}">
                        </div>
                    </div>
                    <div class="wrapper-ingredient__item wrapper-ingredient__item--amount">
                        <div class="recipe-form__item"><label class="recipe-form__label"
                                   for="amount-${pos}">Объем</label><input class="recipe-form__input"
                                   id="amount-${pos}"
                                   name="amount-${pos}"></div>
                    </div>
                    <div class="wrapper-ingredient__item wrapper-ingredient__item--unit">
                        <div class="recipe-form__item"><label class="recipe-form__label"
                                   for="unit-${pos}">Тип</label><select class="recipe-form__input"
                                    id="unit-${pos}"
                                    name="unit-${pos}">
                                <option disabled selected value></option>
                                <option>мл.</option>
                                <option>л.</option>
                                <option>мг.</option>
                                <option>г.</option>
                                <option>кг.</option>
                                <option>ложка</option>
                                <option>стакан</option>
                            </select></div>
                    </div>
                    <div class="wrapper-ingredient__item wrapper-ingredient__item--button"><button type="button" class="recipe-form__button recipe-form__button--delete recipe-form__button--delete-small wrapper-ingredient__button"></button></div>
                </div>`;
    };

    const mongoObjectId = () => {
        /* jslint bitwise: true */
        // eslint-disable-next-line no-bitwise
        const timestamp = ((new Date().getTime() / 1000) | 0).toString(16);
        return (
            timestamp +
            'xxxxxxxxxxxxxxxx'
                .replace(/[x]/g, () => {
                    // eslint-disable-next-line no-bitwise
                    return ((Math.random() * 16) | 0).toString(16);
                })
                .toLowerCase()
        );
    };

    const recipeID = mongoObjectId();

    const countElements = (query) => {
        const elements = document.querySelectorAll(query);
        return elements.length ? elements.length : 0;
    };

    const updateStepsHeaders = () => {
        const steps = document.querySelectorAll('.recipe-form__step');

        steps.forEach((step, index) => {
            const header = step.querySelector('.recipe-form__step-header');
            header.innerHTML = `Шаг ${index + 1}`;
        });
    };

    const removeElement = (element) => {
        element.remove();
    };

    const updateNextElementsAttributes = (nextStep, className) => {
        if (!nextStep.classList.contains(className)) {
            return false;
        }

        const withNames = nextStep.querySelectorAll('[name]');
        const withIds = nextStep.querySelectorAll('[id]');
        const withFors = nextStep.querySelectorAll('[for]');
        withNames.forEach((withName) => {
            const newName = withName.getAttribute('name').split('-');
            newName[1] -= 1;
            withName.setAttribute('name', newName.join('-'));
        });
        withIds.forEach((withName) => {
            const newName = withName.getAttribute('id').split('-');
            newName[1] -= 1;
            withName.setAttribute('id', newName.join('-'));
        });
        withFors.forEach((withName) => {
            const newName = withName.getAttribute('for').split('-');
            newName[1] -= 1;
            withName.setAttribute('for', newName.join('-'));
        });
        return updateNextElementsAttributes(nextStep.nextSibling, className);
    };

    const initStepElement = () => {
        const newStepNumber = countElements('.recipe-form__step');
        const newStep = htmlToElement(createStepHTML(newStepNumber + 1));
        const fileUpload = newStep.querySelector('.recipe-form__input--file');
        const stepImagePreview = newStep.querySelector('.recipe-form__preview-image--step-image');
        const absolutePath = newStep.querySelector(
            `[name="imageAbsolutePath-${newStepNumber + 1}"]`,
        );

        fileUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            stepImagePreview.src = URL.createObjectURL(file);

            const date = new Date();

            uploadStepImagesTasks.forEach((task, i) => {
                if (task[2] === fileUpload) {
                    uploadStepImagesTasks.splice(i, 1);
                }
            });

            const filePath = `${pathToImages}/${recipeID}/${date.getTime()}`;

            absolutePath.value = filePath;
            const storageRef = storage().ref(filePath);
            uploadStepImagesTasks.push([file, storageRef, fileUpload]);
        });

        newStep.addEventListener('click', (event) => {
            const deleteButton = event.target.closest('.recipe-form__button--delete');
            if (newStep.contains(deleteButton) && deleteButton) {
                uploadStepImagesTasks.forEach((task, i) => {
                    if (task[2] === fileUpload) {
                        uploadStepImagesTasks.splice(i, 1);
                    }
                });
                updateNextElementsAttributes(newStep.nextSibling, 'recipe-form__step');
                removeElement(newStep);
                updateStepsHeaders();
            }
        });

        return newStep;
    };

    const initIngredientElement = () => {
        const newIngredientNumber = countElements('.recipe-form__ingredient');
        const newIngredient = htmlToElement(createIngredientHTML(newIngredientNumber + 1));

        newIngredient.addEventListener('click', (event) => {
            const deleteButton = event.target.closest('.recipe-form__button--delete');
            if (newIngredient.contains(deleteButton) && deleteButton) {
                updateNextElementsAttributes(newIngredient.nextSibling, 'recipe-form__ingredient');
                removeElement(newIngredient);
            }
        });

        return newIngredient;
    };

    recipeForm.addEventListener('click', (e) => {
        const addStepButton = e.target.closest('.recipe-form__button--add-step');

        if (recipeForm.contains(addStepButton) && addStepButton) {
            const addStepButtonParent = addStepButton.parentNode;
            addStepButtonParent.insertBefore(initStepElement(), addStepButton);
            updateStepsHeaders();
        }
    });

    recipeForm.addEventListener('click', (e) => {
        const addIngredientButton = e.target.closest('.recipe-form__button--add-ingredient');

        if (recipeForm.contains(addIngredientButton) && addIngredientButton) {
            const addIngredientButtonParent = addIngredientButton.parentNode;
            addIngredientButtonParent.insertBefore(initIngredientElement(), addIngredientButton);
        }
    });

    const uploadImage = (file, ref) => {
        return new Promise((resolve, reject) => {
            const newProgressBar = htmlToElement(modalProgressBar());
            modalButton.parentNode.insertBefore(newProgressBar, modalButton);
            const task = ref.put(file);
            const progressBar = newProgressBar.querySelector('.modal-after-upload__progress-bar');
            progressBar.value = 0;
            task.on(
                'state_changed',
                (snapshot) => {
                    const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    progressBar.value = percentage;
                },
                (error) => {
                    console.error(error);
                    reject(error);
                },
                () => {
                    ref.getDownloadURL().then((imageDownloadUrl) => {
                        resolve(imageDownloadUrl);
                    });
                },
            );
        });
    };

    const postData = (url = '', data = {}) => {
        return new Promise((resolve) => {
            fetch(url, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                },
                redirect: 'follow',
                referrer: 'no-referrer',
                body: JSON.stringify(data),
            }).then((res) => resolve(res.json()));
        });
    };

    recipeForm.addEventListener('submit', (e) => {
        e.preventDefault();

        modalAfterUpload.classList.remove('visually-hidden');

        const recipe = {};
        recipe.ingredients = [];
        recipe.steps = [];

        infoSection.querySelectorAll('[name]').forEach((data) => {
            recipe[data.name] = data.value;
        });

        recipe.categories = recipeCategoriesChoices.getValue(true);
        // eslint-disable-next-line no-underscore-dangle
        recipe._id = recipeID;

        ingredientsSection
            .querySelectorAll('.recipe-form__ingredient')
            .forEach((ingredientElement) => {
                const ingredient = {};
                ingredientElement.querySelectorAll('[name]').forEach((data) => {
                    ingredient[data.name.split('-')[0]] = data.value;
                });
                recipe.ingredients.push(ingredient);
            });

        stepsSection.querySelectorAll('.recipe-form__step').forEach((stepElement) => {
            const step = {};
            stepElement.querySelectorAll('[name]').forEach((data) => {
                step[data.name.split('-')[0]] = data.value;
            });
            recipe.steps.push(step);
        });

        const uploadStepImages = (tasks) => {
            return new Promise((resolve) => {
                const promises = [];
                if (tasks.length > 0) {
                    tasks.forEach(([file, ref]) => {
                        promises.push(uploadImage(file, ref));
                    });

                    Promise.all(promises).then((links) => {
                        links.forEach((link, i) => {
                            recipe.steps[i].imageDownloadUrl = link;
                        });
                        resolve();
                    });
                }
                resolve();
            });
        };
        const uploadPreviewImages = (tasks) => {
            return new Promise((resolve) => {
                const promises = [];
                if (tasks.length > 0) {
                    tasks.forEach(([file, ref]) => {
                        promises.push(uploadImage(file, ref));
                    });

                    Promise.all(promises).then((links) => {
                        links.forEach((link) => {
                            recipe.imagePreviewDownloadUrl = link;
                        });
                        resolve();
                    });
                }
                resolve();
            });
        };

        const uploadRecipe = async () => {
            await uploadPreviewImages(uploadPreviewImagesTasks);
            await uploadStepImages(uploadStepImagesTasks);

            postData('https://backend-for-recipes.herokuapp.com/api/recipes', recipe)
                .then((data) => {
                    modalWindowText.innerHTML = 'Готово';
                    modalButton.removeAttribute('disabled');
                    console.log(data);
                })
                .catch((error) => console.error(error));
        };

        uploadRecipe();
    });

    /* INIT */

    const addStepButton = document.querySelector('.recipe-form__button--add-step');
    const addStepButtonParent = addStepButton.parentNode;
    addStepButtonParent.insertBefore(initStepElement(), addStepButton);

    const addIngredientButton = document.querySelector('.recipe-form__button--add-ingredient');
    const addIngredientButtonParent = addIngredientButton.parentNode;
    addIngredientButtonParent.insertBefore(initIngredientElement(), addIngredientButton);

    const recipePreviewFileUpload = infoSection.querySelector('.recipe-form__input--file');
    const recipePreviewAbsolutePath = infoSection.querySelector(
        '[name="imagePreviewAbsolutePath"]',
    );
    const recipeImagePreview = infoSection.querySelector(
        '.recipe-form__preview-image--cover-image',
    );
    recipePreviewFileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        recipeImagePreview.src = URL.createObjectURL(file);
        const filePath = `${pathToImages}/${recipeID}/preview`;
        recipePreviewAbsolutePath.value = filePath;
        const storageRef = storage().ref(filePath);
        uploadPreviewImagesTasks.push([file, storageRef, recipePreviewFileUpload]);
    });
}
