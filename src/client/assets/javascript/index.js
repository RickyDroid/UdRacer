// PROVIDED CODE BELOW (LINES 1 - 80) DO NOT REMOVE

// The store will hold all information needed globally
var store = {
	track_id: undefined,
	player_id: undefined,
	race_id: undefined,
	tracks: undefined,
}

// We need our javascript to wait until the DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
	onPageLoad()
	setupClickHandlers()
})

async function onPageLoad() {
	try {
		getTracks()
			.then(tracks => {
				const html = renderTrackCards(tracks)
				renderAt('#tracks', html)
			})

		getRacers()
			.then((racers) => {
				const html = renderRacerCars(racers)
				renderAt('#racers', html)
			})
	} catch(error) {
		console.log("Problem getting tracks and racers ::", error.message)
		console.error(error)
	}
}

function setupClickHandlers() {
	document.addEventListener('click', function(event) {
		const { target } = event

		// Race track form field
		if (target.matches('.card.track')) {
			handleSelectTrack(target)
		}

		// Podracer form field
		if (target.matches('.card.podracer')) {
			handleSelectPodRacer(target)
		}

		// Submit create race form
		if (target.matches('#submit-create-race')) {
			event.preventDefault()
	
			// start race
			handleCreateRace()
		}

		// Handle acceleration click
		if (target.matches('#gas-peddle')) {
			handleAccelerate(target)
		}

	}, false)
}

async function delay(ms) {
	try {
		return await new Promise(resolve => setTimeout(resolve, ms));
	} catch(error) {
		console.log("an error shouldn't be possible here")
		console.log(error)
	}
}
// ^ PROVIDED CODE ^ DO NOT REMOVE

// This async function controls the flow of the race, add the logic and error handling
async function handleCreateRace() {
    const track_id = store.track_id;
	const player_id = store.player_id;
	const trackName = store.tracks[track_id - 1].name;
	renderAt('#race', renderRaceStartView(trackName));
	
	try{
		// NOTE :- whenever raceID === 1, startRace will fail.
		// if < 1 or > 1 startRace works ok.
		// This seems to be bug in the game server
		let raceID = await createRace(player_id, track_id)
		.then((raceData) => store.race_id = (raceData.ID - 1))

        await runCountdown();
	
		await startRace(raceID);

		runRace(raceID);
		
	}catch(error){
		//MAIN ERROR COLLECTION POINT
		console.log(error); 
	}
}

function runRace(raceID) {
	try{
		return new Promise(resolve => {
			const raceInterval = setInterval(monitorRace, 500);

			function monitorRace(){
				getRace(raceID)
				.then((raceData) => {
			
					if (raceData.status === "in-progress"){
						renderAt('#leaderBoard', raceProgress(raceData.positions));
					} 

					else if (raceData.status === "finished"){
						clearInterval(raceInterval); 
						renderAt('#race', resultsView(raceData.positions)); 
						resolve(raceData); 
					}

				});//then
			}//monitorRace()
		})//Promise
	
   }catch(error){
	   throw new Error(error);
   }
}

async function runCountdown() {
	try {
		await delay(1000) // wait for the DOM to load
		let timer = 3
      
		return new Promise(resolve => {
            const stopInterval = setInterval(() => {
				document.getElementById('big-numbers').innerHTML = --timer
				if(timer === 0){
					clearInterval(stopInterval);
					resolve();
				}
			}, 1000)
		})
	} catch(error) {
		throw new Error(error);
	}
}

function handleSelectTrack(target) {
	//remove class selected from all track options
	const selected = document.querySelector('#tracks .selected')
	if(selected) {
		selected.classList.remove('selected')
	}
	// add class selected to current target
	target.classList.add('selected')
	store.track_id = parseInt(target.id);
}

function handleSelectPodRacer(target) {
	//remove class selected from all racer options
	const selected = document.querySelector('#racers .selected')
	if(selected) {
		selected.classList.remove('selected')
	}
	// add class selected to current target
	target.classList.add('selected')
	store.player_id = parseInt(target.id);
}

function handleAccelerate() {
	accelerate(store.race_id);
}

// HTML VIEWS ------------------------------------------------
// Provided code - do not remove
function renderTrackCards(tracks) {
	if (!tracks.length) {
		return `
			<h4>Loading Tracks...</4>
		`
	}
	//add to store 
	store.tracks = tracks;
	const results = tracks.map(renderTrackCard).join('')
	return `
		<ul id="tracks">
			${results}
		</ul>
	`
}

function renderTrackCard(track) {
	const { id, name } = track
	return `
		<li id="${id}" class="card track">
			<h3 id="${id}" class="card track">${name}</h3>
		</li>
	`
}

function renderRacerCars(racers) {
	if (!racers.length) {
		return `
			<h4>Loading Racers...</4>
		`
	}
	const results = racers.map(renderRacerCard).join('')
	return `
		<ul id="racers">
			${results}
		</ul>
	`
}

function renderRacerCard(racer) {
	const { id, driver_name, top_speed, acceleration, handling } = racer
	return `
		<li id="${id}" class="card podracer">
			<h3 id="${id}" class="card podracer">${driver_name}</h3>
			<p id="${id}" class="card podracer">Top speed ${top_speed}</p>
			<p id="${id}" class="card podracer">Acceleration ${acceleration}</p>
			<p id="${id}" class="card podracer">Handling ${handling}</p>
		</li>
	`
}

function renderCountdown(count) {
	return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`
}

function renderRaceStartView(trackName) {
	return `
		<header>
			<h1>Race: ${trackName}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>

			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`
}

function resultsView(positions) {
	positions.sort((a, b) => (a.final_position > b.final_position) ? 1 : -1)

	return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			${raceProgress(positions)}
			<a href="/race">Start a new race</a>
		</main>
	`
}

function raceProgress(positions) {
	let userPlayer = positions.find(e => e.id === store.player_id)
	userPlayer.driver_name += " (you)"

	positions = positions.sort((a, b) => (a.segment > b.segment) ? -1 : 1)
	let count = 1

	const results = positions.map(p => {
		return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`
	})

	return `
		<main>
			<h3>Leaderboard</h3>
			<section id="leaderBoard">
				${results}
			</section>
		</main>
	`
}

function renderAt(element, html) {
	const node = document.querySelector(element)
	node.innerHTML = html
}

// ^ Provided code ^ do not remove


// API CALLS ------------------------------------------------

const SERVER = 'http://localhost:8000'

function defaultFetchOpts() {
	return {
		mode: 'cors',
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin' : SERVER,
		},
	}
}

function getTracks() {
	return fetch(`${SERVER}/api/tracks`)
	.then(res => res.json())
	.catch(err => console.log("Problem with getTracks request::", err))
}

function getRacers() {
	return fetch(`${SERVER}/api/cars`)
	.then(res => res.json())
	.catch(err => console.log("Problem with getRacers request::", err))
}

function createRace(player_id, track_id) {
	player_id = parseInt(player_id); 
	track_id = parseInt(track_id);   
	const body = { player_id, track_id }
	
	return fetch(`${SERVER}/api/races`, {
		method: 'POST',
		...defaultFetchOpts(),
		dataType: 'jsonp',
		body: JSON.stringify(body)
	})
	.then(res => res.json())
	.catch(err => console.log("Problem with createRace request::", err))
}

function getRace(id) {
	return fetch(`${SERVER}/api/races/${id}`)
	.then(res => res.json())
	.catch(err => {
		throw new Error("Problem with getRace request::", err)
	})
}

function startRace(id) {
	return fetch(`${SERVER}/api/races/${id}/start`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.catch(err => {
		throw new Error("Problem with startRace request::", err)
	})
}

function accelerate(id) {
	return fetch(`${SERVER}/api/races/${id}/accelerate`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.catch(err => console.log("Problem with accelerate request::", err))
}
