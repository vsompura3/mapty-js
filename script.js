/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const form = document.querySelector('.form')
const containerWorkouts = document.querySelector('.workouts')
const inputType = document.querySelector('.form__input--type')
const inputDuration = document.querySelector('.form__input--duration')
const inputDistance = document.querySelector('.form__input--distance')
const inputCadence = document.querySelector('.form__input--cadence')
const inputElevation = document.querySelector('.form__input--elevation')

class Workout {
  date = new Date()
  id = `${Date.now()}`.slice(-10)
  clicks = 0
  constructor(coords, distance, duration) {
    this.coords = coords
    this.distance = distance // in KM
    this.duration = duration // in Min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'Febuary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`
  }

  click() {
    this.clicks += 1
  }
}

class Running extends Workout {
  type = 'running'
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration)
    this.cadence = cadence
    this.calcPace()
    this._setDescription()
  }

  calcPace() {
    this.pace = this.duration / this.distance
    return this.pace
  }
}

class Cycling extends Workout {
  type = 'cycling'
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration)
    this.elevationGain = elevationGain
    this.calcSpeed()
    this._setDescription()
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60)
    return this.speed
  }
}

// APPLICATION ARCHITECTURE
class App {
  #map
  #mapZoomLevel = 13
  #mapEvent
  #workout = []
  constructor() {
    // Get users position
    this._getPosition()

    // Get data from Local Storage
    this._getLocalStorage()

    // Attach Event Handlers
    form.addEventListener('submit', this._newWorkout.bind(this))
    inputType.addEventListener('change', this._toggleElevationField)
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
  }

  _getPosition() {
    navigator.geolocation &&
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position.')
        },
      )
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords
    const coords = [latitude, longitude]
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel)
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map)

    // Handling clicks on Map
    this.#map.on('click', this._showForm.bind(this))

    // Render marker on map load
    this.#workout.forEach(work => {
      this._renderWorkoutMarker(work)
    })
  }

  _showForm(mapE) {
    this.#mapEvent = mapE
    form.classList.remove('hidden')
    inputDistance.focus()
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        ''
    form.style.display = 'none'
    form.classList.add('hidden')
    setTimeout(() => {
      form.style.display = 'grid'
    }, 1000)
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
  }

  _newWorkout(e) {
    const validInputs = (...inputs) => inputs.every(i => Number.isFinite(i))
    const allPositive = (...inputs) => inputs.every(i => i > 0)

    e.preventDefault()
    // Get data from form
    const type = inputType.value
    const distance = +inputDistance.value
    const duration = +inputDuration.value
    const { lat, lng } = this.#mapEvent.latlng
    let workout

    // If running workout, create Running object
    if (type === 'running') {
      const cadence = +inputCadence.value
      // Check if data is valid
      // if (!Number.isFinite(distance) || Number.isFinite(duration)) || Number.isFinite(cadence)
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input is not valid')

      workout = new Running([lat, lng], distance, duration, cadence)
    }

    // If cycling workout, create Cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value
      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input is not valid')

      workout = new Cycling([lat, lng], distance, duration, elevation)
    }

    // Add the object to workout array
    this.#workout.push(workout)

    // Render workout on map as a marker
    this._renderWorkoutMarker(workout)

    // Render workout on the list
    this._renderWorkout(workout)

    // Reset and Hide the form
    this._hideForm()

    // Set Local Storage
    this._setLocalStorage()
  }

  _renderWorkoutMarker({ coords, distance, type, description }) {
    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${type}-popup`,
        }),
      )
      .setPopupContent(`${type === 'running' ? '🏃‍♂️' : '🚴'} ${description}`)
      .openPopup()
  }

  _renderWorkout({
    distance,
    duration,
    id,
    type,
    description,
    pace,
    cadence,
    speed,
    elevationGain,
  }) {
    let html = `
      <li class="workout workout--${type}" data-id="${id}">
        <h2 class="workout__title">${description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${type === 'running' ? '🏃‍♂️' : '🚴'}</span>
          <span class="workout__value">${distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `

    if (type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${pace.toFixed(2)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `
    }

    if (type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${speed.toFixed(2)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `
    }

    form.insertAdjacentHTML('afterend', html)
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout')
    if (!workoutEl) return
    const workout = this.#workout.find(work => work.id === workoutEl.dataset.id)
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    })

    // Using public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workout))
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'))
    if (!data) return
    this.#workout = data

    this.#workout.forEach(work => {
      this._renderWorkout(work)
    })
  }

  reset() {
    localStorage.removeItem('workouts')
    location.reload()
  }
}

const app = new App()
