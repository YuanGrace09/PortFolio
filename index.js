const followers = document.querySelectorAll('.follower');
const container = document.getElementById('dragContainer');
const targetZone = document.getElementById('targetZone');
const pipControlImg = document.getElementById('pipControlImg');
const expandOverlay = document.getElementById('expandOverlay');

let activeElement = null;
let isDragging = false;
let startX, startY;
let initialLeft, initialTop;
let highestZIndex = 10;

let isPipGlobalActive = false;
let isLoopRunning = false;
const physicsObjects = [];

function initPhysics() {
	const containerWidth = container.clientWidth;
	const containerHeight = container.clientHeight;
	const imgWidth = 100;

	const topY = containerHeight * 0.05;
	const bottomY = containerHeight * 0.25;

	const topX1 = (containerWidth * 0.30) - (imgWidth / 2);
	const topX2 = (containerWidth * 0.50) - (imgWidth / 2);
	const topX3 = (containerWidth * 0.70) - (imgWidth / 2);

	const bottomX1 = (containerWidth * 0.40) - (imgWidth / 2);
	const bottomX2 = (containerWidth * 0.60) - (imgWidth / 2);

	const positions = [
		{ left: topX1, top: topY },
		{ left: topX2, top: topY },
		{ left: topX3, top: topY },
		{ left: bottomX1, top: bottomY },
		{ left: bottomX2, top: bottomY }
	];

	followers.forEach((el, index) => {
		const pos = positions[index];
		el.style.left = `${pos.left}px`;
		el.style.top = `${pos.top}px`;

		physicsObjects.push({
			id: index,
			element: el,
			x: pos.left,
			y: pos.top,
			vy: 0,
			gravity: 0.9,
			bounce: -0.2,
			isFalling: true
		});
	});

	startPhysicsLoop();
}

function animateRectExpand(onComplete) {
	const containerWidth = container.clientWidth;
	const containerHeight = container.clientHeight;

	const initialWidth = 120;
	const initialHeight = 120;
	const initialTop = 20;
	const initialRight = 20;

	let currentWidth = initialWidth;
	let currentHeight = initialHeight;
	let currentTop = initialTop;
	let currentRight = initialRight;

	expandOverlay.style.opacity = '1';

	const expandSpeed = 80; 

	function step() {
		if (currentHeight < containerHeight) {
			currentWidth += expandSpeed;
			currentHeight += expandSpeed;

			currentTop = Math.max(0, initialTop - (currentHeight - initialHeight) * 0.25);
			currentRight = Math.max(0, initialRight - (currentWidth - initialWidth) * 0.25);

			if (currentHeight >= containerHeight) {
				currentHeight = containerHeight;
				currentTop = 0;
			}
		} else {
			currentWidth += expandSpeed * 2.5;
			currentRight = 0;
		}

		if (currentWidth >= containerWidth) {
			currentWidth = containerWidth;
		}

		expandOverlay.style.width = `${currentWidth}px`;
		expandOverlay.style.height = `${currentHeight}px`;
		expandOverlay.style.top = `${currentTop}px`;
		expandOverlay.style.right = `${currentRight}px`;

		if (currentWidth >= containerWidth && currentHeight >= containerHeight) {
			container.classList.add('pip-active-bg');
			if (onComplete) onComplete();
		} else {
			requestAnimationFrame(step);
		}
	}

	requestAnimationFrame(step);
}

targetZone.addEventListener('click', () => {
	isPipGlobalActive = !isPipGlobalActive;

	const offSrc = pipControlImg.getAttribute('data-off-src');
	const onSrc = pipControlImg.getAttribute('data-on-src');

	if (isPipGlobalActive) {
		if (onSrc) pipControlImg.src = onSrc;

		animateRectExpand();

		followers.forEach(el => el.classList.add('stroke-bg'));

		physicsObjects.forEach(obj => {
			obj.isFalling = false;
			obj.vy = 0;
		});
	} else {
		if (offSrc) pipControlImg.src = offSrc;
		expandOverlay.style.opacity = '0';
		expandOverlay.style.width = '120px';
		expandOverlay.style.height = '120px';
		expandOverlay.style.top = '20px';
		expandOverlay.style.right = '20px';

		container.classList.remove('pip-active-bg');
		followers.forEach(el => el.classList.remove('stroke-bg'));
		physicsObjects.forEach(obj => {
			obj.isFalling = true;
		});
		startPhysicsLoop();
	}
});

function resolvePushCollisions() {
	const containerWidth = container.clientWidth;
	const imgSize = 100;

	for (let iteration = 0; iteration < 3; iteration++) {
		for (let i = 0; i < physicsObjects.length; i++) {
			for (let j = 0; j < physicsObjects.length; j++) {
				if (i === j) continue;

				const objA = physicsObjects[i];
				const objB = physicsObjects[j];

				if (isPipGlobalActive || objB.element === activeElement) continue;

				const wA = objA.element.offsetWidth || imgSize;
				const hA = objA.element.offsetHeight || imgSize;
				const wB = objB.element.offsetWidth || imgSize;
				const hB = objB.element.offsetHeight || imgSize;

				const overlapX = Math.min(objA.x + wA, objB.x + wB) - Math.max(objA.x, objB.x);
				const overlapY = Math.min(objA.y + hA, objB.y + hB) - Math.max(objA.y, objB.y);

				if (overlapX > 0 && overlapY > 0) {
					if (overlapX < overlapY) {
						if (objA.x < objB.x) {
							objB.x += overlapX;
						} else {
							objB.x -= overlapX;
						}

						objB.x = Math.max(0, Math.min(objB.x, containerWidth - wB));
						objB.element.style.left = `${objB.x}px`;
						objB.isFalling = true;
					}
				}
			}
		}
	}
}

function getFloorY(currentObj) {
	const containerHeight = container.clientHeight;
	const curWidth = currentObj.element.offsetWidth || 100;
	const curHeight = currentObj.element.offsetHeight || 100;

	let highestSupportedFloor = containerHeight - curHeight;
	const margin = 10;

	physicsObjects.forEach(otherObj => {
		if (otherObj.id === currentObj.id || otherObj.element === activeElement || isPipGlobalActive) return;

		const otherWidth = otherObj.element.offsetWidth || 100;

		const overlapX = (currentObj.x + margin < otherObj.x + otherWidth) &&
		                 (currentObj.x + curWidth - margin > otherObj.x);

		if (overlapX && currentObj.y < otherObj.y) {
			const candidateFloor = otherObj.y - curHeight;
			if (candidateFloor < highestSupportedFloor) {
				highestSupportedFloor = candidateFloor;
			}
		}
	});

	return highestSupportedFloor;
}

function updatePhysics() {
	let stillFalling = false;

	resolvePushCollisions();

	physicsObjects.forEach(obj => {
		if (isPipGlobalActive || obj.element === activeElement) return;

		const targetFloorY = getFloorY(obj);

		if (!obj.isFalling && obj.y < targetFloorY - 1) {
			obj.isFalling = true;
		}

		if (obj.isFalling) {
			obj.vy += obj.gravity;
			obj.y += obj.vy;

			if (obj.y >= targetFloorY) {
				obj.y = targetFloorY;
				obj.vy *= obj.bounce;

				if (Math.abs(obj.vy) < 1) {
					obj.vy = 0;
					obj.isFalling = false;
				}
			}

			obj.element.style.top = `${obj.y}px`;
			stillFalling = true;
		}
	});

	if (stillFalling || isDragging) {
		requestAnimationFrame(updatePhysics);
	} else {
		isLoopRunning = false;
	}
}

function startPhysicsLoop() {
	if (!isLoopRunning) {
		isLoopRunning = true;
		requestAnimationFrame(updatePhysics);
	}
}

initPhysics();

followers.forEach((follower) => {
	follower.addEventListener('mousedown', onStart);
	follower.addEventListener('touchstart', onStart, { passive: false });
	follower.addEventListener('dragstart', (e) => e.preventDefault());
});

function onStart(e) {
	isDragging = true;
	activeElement = e.currentTarget;

	const physObj = physicsObjects.find(o => o.element === activeElement);
	if (physObj && !isPipGlobalActive) {
		physObj.isFalling = false;
	}

	highestZIndex++;
	activeElement.style.zIndex = highestZIndex;

	const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
	const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

	startX = clientX;
	startY = clientY;

	initialLeft = activeElement.offsetLeft;
	initialTop = activeElement.offsetTop;

	document.addEventListener('mousemove', onMove);
	document.addEventListener('mouseup', onEnd);
	document.addEventListener('touchmove', onMove, { passive: false });
	document.addEventListener('touchend', onEnd);

	startPhysicsLoop();
}

function onMove(e) {
	if (!isDragging || !activeElement) return;

	if (e.cancelable) e.preventDefault();

	const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
	const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

	const deltaX = clientX - startX;
	const deltaY = clientY - startY;

	let newLeft = initialLeft + deltaX;
	let newTop = initialTop + deltaY;

	const maxLeft = container.clientWidth - activeElement.offsetWidth;
	const maxTop = container.clientHeight - activeElement.offsetHeight;

	newLeft = Math.max(0, Math.min(newLeft, maxLeft));
	newTop = Math.max(0, Math.min(newTop, maxTop));

	activeElement.style.left = `${newLeft}px`;
	activeElement.style.top = `${newTop}px`;

	const physObj = physicsObjects.find(o => o.element === activeElement);
	if (physObj) {
		physObj.x = newLeft;
		physObj.y = newTop;
	}

	physicsObjects.forEach(o => {
		if (o.element !== activeElement && !isPipGlobalActive) {
			o.isFalling = true;
		}
	});

	startPhysicsLoop();
}

function onEnd() {
	if (activeElement) {
		const physObj = physicsObjects.find(o => o.element === activeElement);
		if (physObj && !isPipGlobalActive) {
			physObj.vy = 0;
			physObj.isFalling = true;
		}
	}

	physicsObjects.forEach(o => {
		if (!isPipGlobalActive) {
			o.isFalling = true;
		}
	});

	isDragging = false;
	activeElement = null;

	startPhysicsLoop();

	document.removeEventListener('mousemove', onMove);
	document.removeEventListener('mouseup', onEnd);
	document.removeEventListener('touchmove', onMove);
	document.removeEventListener('touchend', onEnd);
}