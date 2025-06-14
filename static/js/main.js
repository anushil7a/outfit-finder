// Delete outfit function - defined globally
// window.deleteOutfit = async (outfitId) => {
//     if (!confirm('Are you sure you want to delete this outfit? This action cannot be undone.')) {
//         return;
//     }

//     try {
//         const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
//         if (!csrfToken) {
//             throw new Error('CSRF token not found');
//         }

//         const response = await fetch(`/delete-outfit/${outfitId}`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'X-CSRFToken': csrfToken
//             }
//         });

//         if (response.ok) {
//             const outfitCard = document.querySelector(`[data-outfit-id="${outfitId}"]`);
//             if (outfitCard) {
//                 outfitCard.remove();
//                 // If no outfits left, reload the page
//                 const remainingOutfits = document.querySelectorAll('[data-outfit-id]');
//                 if (remainingOutfits.length === 0) {
//                     window.location.reload();
//                 }
//             }
//         } else {
//             throw new Error('Failed to delete outfit');
//         }
//     } catch (error) {
//         console.error('Error deleting outfit:', error);
//         alert('Error deleting outfit. Please try again.');
//     }
// };

document.addEventListener('DOMContentLoaded', () => {
    const clothingUpload = document.getElementById('clothing-upload');
    const preferencesForm = document.getElementById('preferences-form');
    const recommendationsContainer = document.getElementById('recommendations');
    const uploadPreview = document.getElementById('upload-preview');
    const previewContainer = document.getElementById('preview-container');
    const confirmUpload = document.getElementById('confirm-upload');
    const selectAllBtn = document.getElementById('select-all');
    const deselectAllBtn = document.getElementById('deselect-all');
    const favoriteSelectedBtn = document.getElementById('favorite-selected');
    const deleteSelectedBtn = document.getElementById('delete-selected');
    const outfitCheckboxes = document.querySelectorAll('.outfit-checkbox');
    const selectedCount = document.getElementById('selected-count');
    const refreshButton = document.getElementById('refresh-recommendations');

    // Add event listener for refresh recommendations button
    if (refreshButton) {
        refreshButton.addEventListener('click', refreshRecommendations);
    }

    let selectedFiles = [];
    let favoriteFiles = new Set();

    // Update selected count
    function updateSelectedCount() {
        const count = selectedFiles.filter(file => !file.removed).length;
        selectedCount.textContent = count;
        confirmUpload.disabled = count === 0;
    }

    // Handle clothing image selection
    clothingUpload.addEventListener('change', (e) => {
        const newFiles = Array.from(e.target.files);
        selectedFiles = [...selectedFiles, ...newFiles.map(file => ({ file, removed: false }))];
        
        if (selectedFiles.length > 0) {
            uploadPreview.classList.remove('hidden');
            
            // Only add previews for new files
            newFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.createElement('div');
                    preview.className = 'relative group';
                    preview.dataset.filename = file.name;
                    preview.innerHTML = `
                        <div class="relative">
                            <img src="${e.target.result}" alt="Preview" class="w-full h-48 object-cover rounded-lg">
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg">
                                <div class="absolute top-2 right-2 flex space-x-2">
                                    <button class="delete-btn bg-white text-gray-600 rounded-full p-1 hover:bg-red-500 hover:text-white transition-colors duration-200" onclick="removeSelectedFile('${file.name}')">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    previewContainer.appendChild(preview);
                };
                reader.readAsDataURL(file);
            });
            updateSelectedCount();
        }
    });

    // Remove selected file
    window.removeSelectedFile = (fileName) => {
        // Mark file as removed
        const fileIndex = selectedFiles.findIndex(f => f.file.name === fileName);
        if (fileIndex !== -1) {
            selectedFiles[fileIndex].removed = true;
        }
        
        // Remove the preview element
        const preview = previewContainer.querySelector(`[data-filename="${fileName}"]`);
        if (preview) {
            preview.remove();
        }
        
        // Hide preview container if no files left
        if (selectedFiles.every(f => f.removed)) {
            uploadPreview.classList.add('hidden');
        }
        
        updateSelectedCount();
    };

    // Select all files
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            outfitCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        });
    }

    // Deselect all files
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            outfitCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        });
    }

    // Handle confirm upload
    if (confirmUpload) {
        confirmUpload.addEventListener('click', async () => {
            const filesToUpload = selectedFiles.filter(f => !f.removed).map(f => f.file);
            
            if (filesToUpload.length === 0) {
                alert('Please select at least one image to upload');
                return;
            }

            const formData = new FormData();
            for (let file of filesToUpload) {
                formData.append('image', file);
            }

            try {
                confirmUpload.disabled = true;
                confirmUpload.textContent = 'Uploading...';

                const response = await fetch('/upload', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.content
                    },
                    body: formData
                });

                const data = await response.json();
                
                if (response.ok) {
                    alert(data.message);
                    // Reset the form
                    clothingUpload.value = '';
                    selectedFiles = [];
                    favoriteFiles.clear();
                    uploadPreview.classList.add('hidden');
                    previewContainer.innerHTML = '';
                    // Reload the page to show new uploads
                    window.location.reload();
                } else {
                    throw new Error(data.error || 'Upload failed');
                }
            } catch (error) {
                console.error('Error uploading images:', error);
                alert(error.message || 'Error uploading images. Please try again.');
            } finally {
                confirmUpload.disabled = false;
                confirmUpload.textContent = 'Upload Selected Images';
            }
        });
    }

    if (clothingUpload && confirmUpload) {
        confirmUpload.addEventListener('click', function(e) {
            const files = clothingUpload.files;
            let totalSize = 0;
            for (const file of files) totalSize += file.size;
            if (totalSize > 16 * 1024 * 1024) { // 16MB
                alert('Total upload size exceeds 16MB. Please select fewer or smaller files.');
                e.preventDefault();
                return false;
            }
        });
    }

    if (clothingUpload) {
        clothingUpload.addEventListener('change', function() {
            let totalSize = 0;
            for (const file of clothingUpload.files) totalSize += file.size;
            if (totalSize > 16 * 1024 * 1024) {
                alert('Total upload size exceeds 16MB. Please select fewer or smaller files.');
                clothingUpload.value = '';
            }
        });
    }

    // Handle style preferences
    const styleOtherCheckbox = document.querySelector('input[name="styles"][value="other"]');
    const otherStyleContainer = document.getElementById('other-style-container');
    const otherStyleInput = document.querySelector('input[name="other_style"]');

    if (styleOtherCheckbox && otherStyleContainer) {
        // Check if "other" is checked on page load
        if (styleOtherCheckbox.checked) {
            otherStyleContainer.classList.remove('hidden');
        }

        // Show/hide custom style input when "other" is checked/unchecked
        styleOtherCheckbox.addEventListener('change', function() {
            otherStyleContainer.classList.toggle('hidden', !this.checked);
            if (!this.checked && otherStyleInput) {
                otherStyleInput.value = '';
            }
        });
    }

    // Handle preferences form submission
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('=== Preferences Form Submission Start ===');
            
            // Get all form data
            const formData = new FormData(this);
            const formDataObj = Object.fromEntries(formData);
            console.log('Raw form data:', formDataObj);
            
            // Get all checked styles
            const styleCheckboxes = document.querySelectorAll('input[name="styles"]:checked');
            console.log('Style checkboxes found:', styleCheckboxes.length);
            const styles = Array.from(styleCheckboxes).map(cb => cb.value);
            console.log('Selected styles:', styles);
            
            // Get other style input if checked
            const otherStyleInput = document.querySelector('input[name="other_style"]');
            console.log('Other style input element:', otherStyleInput);
            console.log('Other style value:', otherStyleInput ? otherStyleInput.value : 'not found');
            
            // Get hair color
            const hairColorSelect = document.getElementById('hair_color');
            console.log('Hair color select element:', hairColorSelect);
            console.log('Hair color value:', hairColorSelect ? hairColorSelect.value : 'not found');
            
            // Create preferences object
            const preferences = {
                styles: styles,
                skin_tone_color: formData.get('skin_tone_color'),
                skin_tone_text: formData.get('skin_tone_text'),
                hair_color: hairColorSelect ? hairColorSelect.value : null,
                other_hair_color: formData.get('other_hair_color'),
                height: formData.get('height'),
                weight: formData.get('weight'),
                gender: formData.get('gender')
            };
            
            // Only include custom_style if 'other' is checked
            if (styleOtherCheckbox && styleOtherCheckbox.checked && otherStyleInput && otherStyleInput.value.trim()) {
                preferences.other_style = otherStyleInput.value.trim();
            } else {
                preferences.other_style = undefined;
            }
            
            console.log('Final preferences object:', preferences);
            
            try {
                // Get CSRF token from hidden input
                const csrfToken = document.querySelector('input[name="csrf_token"]');
                console.log('CSRF token element:', csrfToken);
                console.log('CSRF token value:', csrfToken ? csrfToken.value : 'not found');
                
                if (!csrfToken || !csrfToken.value) {
                    throw new Error('CSRF token not found');
                }
                
                console.log('Sending request to /preferences');
                const response = await fetch('/preferences', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken.value
                    },
                    body: JSON.stringify(preferences)
                });
                
                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);
                
                if (response.ok) {
                    alert('Preferences saved successfully!');
                } else {
                    alert(data.error || 'Failed to save preferences');
                }
            } catch (error) {
                console.error('Error saving preferences:', error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack
                });
                alert('Error saving preferences. Please try again.');
            }
            console.log('=== Preferences Form Submission End ===');
        });
    }

    // Handle skin tone color wheel and text input
    const skinToneColor = document.getElementById('skin_tone_color');
    const skinToneText = document.getElementById('skin_tone_text');
    const skinTonePreview = document.getElementById('skin_tone_preview');

    if (skinToneColor && skinToneText && skinTonePreview) {
        // Update preview when color changes
        skinToneColor.addEventListener('input', (e) => {
            skinTonePreview.style.backgroundColor = e.target.value;
            skinToneText.value = e.target.value;
        });

        // Update color when text changes
        skinToneText.addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(color)) {
                skinToneColor.value = color;
                skinTonePreview.style.backgroundColor = color;
            }
        });
    }

    // Handle hair color selection
    const hairColorSelect = document.getElementById('hair_color');
    const otherHairColorInput = document.getElementById('other_hair_color');
    const otherHairColorContainer = document.getElementById('other_hair_color_container');

    if (hairColorSelect && otherHairColorInput && otherHairColorContainer) {
        hairColorSelect.addEventListener('change', (e) => {
            if (e.target.value === 'other') {
                otherHairColorContainer.classList.remove('hidden');
                otherHairColorInput.required = true; // Make the custom input required when "other" is selected
            } else {
                otherHairColorContainer.classList.add('hidden');
                otherHairColorInput.required = false;
            }
        });

        // Initialize visibility based on current selection
        if (hairColorSelect.value === 'other') {
            otherHairColorContainer.classList.remove('hidden');
            otherHairColorInput.required = true;
        }
    }

    // Handle location update
    const locationForm = document.getElementById('location-form');
    const updateLocationBtn = document.getElementById('update-location-btn');
    
    // Define updateLocation function globally
    window.updateLocation = async () => {
        console.log('Update location button clicked');
        
        const location = document.getElementById('location-input').value;
        console.log('Location value:', location);
        
        if (!location) {
            alert('Please enter a location');
            return;
        }
        
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            console.log('CSRF Token:', csrfToken);
            
            if (!csrfToken) {
                throw new Error('CSRF token not found');
            }

            console.log('Sending location update request');
            const response = await fetch('/update-location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ location })
            });
            console.log('Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Response data:', data);
                
                // Update weather display
                const weatherSection = document.getElementById('weather-section');
                if (weatherSection && data.weather) {
                    weatherSection.style.display = 'block';
                    weatherSection.innerHTML = `
                        <h2 class="text-2xl font-bold mb-4">Today's Weather</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="bg-gray-50 rounded-lg p-4">
                                <div class="flex items-center space-x-4 mb-4">
                                    <img src="${data.weather.icon}" alt="${data.weather.description}" class="w-16 h-16">
                                    <div>
                                        <h3 class="text-xl font-semibold">${data.weather.temperature}°F</h3>
                                        <p class="text-gray-600 capitalize">${data.weather.description}</p>
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <p><span class="font-medium">Feels like:</span> ${data.weather.feels_like}°F</p>
                                    <p><span class="font-medium">Humidity:</span> ${data.weather.humidity}%</p>
                                    <p><span class="font-medium">Wind Speed:</span> ${data.weather.wind_speed} mph</p>
                                </div>
                            </div>
                        </div>
                    `;
                }
                
                // Show success message
                alert('Location updated successfully!');
            } else {
                const errorData = await response.json();
                console.error('Error response:', errorData);
                throw new Error(errorData.error || 'Failed to update location');
            }
        } catch (error) {
            console.error('Error updating location:', error);
            alert(error.message || 'Error updating location. Please try again.');
        }
    };

    // Add click event listener to the update location button
    if (updateLocationBtn) {
        updateLocationBtn.addEventListener('click', window.updateLocation);
    }

    // Also handle form submission
    if (locationForm) {
        locationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            window.updateLocation();
        });
    }
}); 

// === static/js/main.js  (2025-05-21) =======================================

// tiny DOM helpers ----------------------------------------------------------
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const csrf = () => $('meta[name="csrf-token"]')?.content;

// ---------------------------------------------------------------------------
// 1.  SINGLE-CARD ACTIONS  (star / trash icons)
// ---------------------------------------------------------------------------
// Remove window.toggleFavorite definition from here to avoid redundancy

// ---------------------------------------------------------------------------
// 2.  TOOLBAR BUTTONS  (select / deselect / favorite-selected / delete-selected)
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const selAll = $('#select-all');
    const desAll = $('#deselect-all');
    const favSel = $('#favorite-selected');
    const delSel = $('#delete-selected');

    const boxes = () => $$('input.outfit-checkbox');

    selAll?.addEventListener('click', () => boxes().forEach(cb => cb.checked = true));
    desAll?.addEventListener('click', () => boxes().forEach(cb => cb.checked = false));

    favSel?.addEventListener('click', async () => {
        const ids = boxes().filter(cb => cb.checked).map(cb => cb.dataset.outfitId);
        if (!ids.length) return alert('Select at least one outfit first');

        for (const id of ids) await window.toggleFavorite(id);
        boxes().forEach(cb => cb.checked = false);
    });

    delSel?.addEventListener('click', async () => {
        const ids = boxes().filter(cb => cb.checked).map(cb => cb.dataset.outfitId);
        if (!ids.length) return alert('Select at least one outfit first');
        if (!confirm(`Delete ${ids.length} outfit(s)? This can't be undone.`)) return;

        for (const id of ids) await window.deleteOutfit(id, /* confirmDialog */ false);
    });
});

// Weather Recommendations Persistence Logic
function displayWeatherRecommendations(recommendations) {
    const recommendationsDiv = document.getElementById('weather-recommendations');
    if (!recommendationsDiv) return;
    recommendationsDiv.innerHTML = '';
    recommendations.forEach((outfit, index) => {
        const outfitDiv = document.createElement('div');
        outfitDiv.className = 'p-4 bg-gray-50 rounded-lg';
        let itemsHtml = '';
        outfit.items.forEach(item => {
            itemsHtml += `<li class="flex items-center space-x-2">
                <span>${item.name}</span>
                ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" class="w-10 h-10 object-cover rounded cursor-zoom-in weather-item-img" data-img="${item.image_url}" style="display:inline-block;vertical-align:middle;" />` : ''}
            </li>`;
        });
        outfitDiv.innerHTML = `
            <h3 class="font-semibold mb-2">Outfit ${index + 1}</h3>
            <div class="mb-2">
                <strong>Items:</strong>
                <ul class="list-disc list-inside">
                    ${itemsHtml}
                </ul>
            </div>
            <p class="text-gray-600">${outfit.explanation}</p>
            <div class="mt-2 text-sm text-gray-500">
                Confidence: ${(outfit.confidence * 100).toFixed(0)}%
            </div>
        `;
        recommendationsDiv.appendChild(outfitDiv);
    });
    // Modal logic for zooming images
    let modal = document.getElementById('weather-image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'weather-image-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        modal.style.display = 'none';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '9999';
        modal.style.cursor = 'pointer';
        modal.style.transition = 'opacity 0.3s ease-in-out';
        modal.style.opacity = '0';
        const modalImage = document.createElement('img');
        modalImage.id = 'weather-modal-image';
        modalImage.style.maxWidth = '90%';
        modalImage.style.maxHeight = '90%';
        modalImage.style.objectFit = 'contain';
        modalImage.style.cursor = 'default';
        modal.appendChild(modalImage);
        document.body.appendChild(modal);
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.opacity = '0';
                setTimeout(function() {
                    modal.style.display = 'none';
                }, 300);
            }
        });
    }
    document.querySelectorAll('.weather-item-img').forEach(img => {
        img.addEventListener('click', function(e) {
            e.stopPropagation();
            const modal = document.getElementById('weather-image-modal');
            const modalImage = document.getElementById('weather-modal-image');
            modalImage.src = this.dataset.img;
            modal.style.display = 'flex';
            setTimeout(function() {
                modal.style.opacity = '1';
            }, 10);
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Weather recommendations persistence
    const recommendationsDiv = document.getElementById('weather-recommendations');
    const refreshBtn = document.getElementById('refresh-recommendations');
    if (recommendationsDiv && refreshBtn) {
        // Load from localStorage
        const stored = localStorage.getItem('weatherRecommendations');
        if (stored) {
            try {
                const recs = JSON.parse(stored);
                if (Array.isArray(recs)) {
                    displayWeatherRecommendations(recs);
                }
            } catch (e) { /* ignore */ }
        }
        // Refresh button handler
        refreshBtn.addEventListener('click', async function() {
            try {
                const response = await fetch('/get-weather-recommendations');
                const data = await response.json();
                if (data.error) {
                    console.error('Error:', data.error);
                    return;
                }
                localStorage.setItem('weatherRecommendations', JSON.stringify(data.recommendations));
                displayWeatherRecommendations(data.recommendations);
            } catch (error) {
                console.error('Error fetching recommendations:', error);
            }
        });
    }
});

function refreshRecommendations() {
    fetch('/get-weather-recommendations')
        .then(response => response.json())
        .then(data => {
            const recommendationsDiv = document.getElementById('weather-recommendations');
            if (data.error) {
                if (data.status === 'location_required') {
                    recommendationsDiv.innerHTML = `
                        <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-blue-700">
                                        ${data.error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    recommendationsDiv.innerHTML = `
                        <div class="bg-red-50 border-l-4 border-red-400 p-4">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-red-700">
                                        ${data.error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    `;
                }
                return;
            }
            displayWeatherRecommendations(data.recommendations);
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
            const recommendationsDiv = document.getElementById('weather-recommendations');
            recommendationsDiv.innerHTML = `
                <div class="bg-red-50 border-l-4 border-red-400 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-red-700">
                                Failed to get recommendations. Please try again.
                            </p>
                        </div>
                    </div>
                </div>
            `;
        });
}
