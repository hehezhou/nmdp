clear();
async function peer(isSender) {
	clear();

	const name = isSender ? 'A' : 'B';
	write(name);

	let input = document.createElement('input');
	let button = document.createElement('button');
	button.innerText = 'OK';
	write(input);
	write(button);

	let config = {
		iceServers: [{
			urls: "stun:stun.stunprotocol.org",
		},{
			urls: "stun:stun1.l.google.com:19302",
		}],
	};

	function send(s){
		write(JSON.stringify(s)+'$');
	}

	let connection = new RTCPeerConnection(config);
	connection.addEventListener('icecandidate', ({candidate}) => {
		send(candidate);
	});

	/**
	 * @param {RTCDataChannel} channel 
	 */
	function channelOpen(channel) {
		setInterval(() => {
			channel.send('QAQ');
		}, 1000);
		channel.addEventListener('message', event => {
			let message = event.data;
			write(`${name} received ${message}`);
		})
	}

	if (isSender) {
		let channel = connection.createDataChannel('c');
		let offer = await connection.createOffer();
		await connection.setLocalDescription(offer);
		send(offer);
		channel.addEventListener('open', () => {
			channelOpen(channel);
		});
	}
	else {
		connection.addEventListener('datachannel', event => {
			let channel = event.channel;
			channel.addEventListener('open', () => {
				channelOpen(channel);
			});
		});
	}

	async function onInput(data){
		if (first) {
			first = false;
			let desp = new RTCSessionDescription(data);
			await connection.setRemoteDescription(desp);
			if (!isSender) {
				let answer = await connection.createAnswer();
				await connection.setLocalDescription(answer);
				send(answer);
			}
		}
		else {
			await connection.addIceCandidate(data);
		}
	}

	let first = true;
	button.addEventListener('click', async () => {
		let data = input.value.split('$').filter(s=>s.trim()!=='').map(JSON.parse);
		input.value = '';
		for(let message of data){
			await onInput(message);
		}
	});
}

let send = document.createElement('button');
send.innerText = `A`;
send.addEventListener('click', () => peer(true));
write(send);
let receive = document.createElement('button');
receive.innerText = `B`;
receive.addEventListener('click', () => peer(false));
write(receive);