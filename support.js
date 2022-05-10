// Setup state objects
const windowState = {
    height: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight,
    width: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
  };
  
  // Init video state
  const videoState = {
    streaming: false,
    facingUser: true,
    supportsFacing: false,
    width: 0,
    height: windowState.height > 725 ? 725 : windowState.height - windowState.height / 3,
    stream: null,
    startAgainTimeout: null,
    processImgInterval: null,
    broadcast: new BroadcastChannel('qrcode-channel'),
    reading: true,
  };
  
  // The HTML elements we need to manage.
  // We will query the DOM once the page is loaded to initialize these.
  const elements = {
    animateSwitch: null,
    video: null,
    cameraContainer: null,
    camera: null,
    canvas: null,
    photo: null,
    startButton: null,
    restartButton: null,
    downloadButton: null,
    flipButton: null,
    output: null,
  };
  
  // Non output elements
  const buttons = ['startButton', 'restartButton', 'downloadButton', 'flipButton'];
  
  // We will use the window size to determine how large we can set the video to be
  const calculateWidth = () => {
    videoState.height = windowState.height > 725 ? 725 : windowState.height - windowState.height / 3;
    videoState.width = elements.video.videoWidth / (elements.video.videoHeight / videoState.height); // Attempt to find the aspect ratio
  
    // Whoops
    if (isNaN(videoState.width)) {
      videoState.width = videoState.height / (4 / 3); // Lets try 4/3
    }
  };
  
  const calculateHeight = () => {
    videoState.width = windowState.width - 50;
    videoState.height = elements.video.videoHeight / (elements.video.width / videoState.width);
  
    if (isNaN(videoState.height)) {
      videoState.height = videoState.width / (4 / 3);
    }
  };
  
  const calculateSize = () => {
    // Since height is already assumed to be set, let's calc the width
    calculateWidth();
  
    // If we calculate the width based on the current height, and it's larger than the screen is wide lets calculate the height instead
    if (windowState.width < videoState.width) {
      calculateHeight();
    }
  };
  
  // When we resize, lets re calc the sizes
  const handleResize = () => {
    windowState.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    windowState.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  
    // If we are streaming, lets stop the stream
    if (videoState.streaming) {
      transitionStart();
      videoState.stream.getTracks().forEach((trk) => trk.stop());
      videoState.streaming = false;
  
      // Debounce the initate call until we finish resizing
      if (videoState.startAgainTimeout) clearTimeout(videoState.startAgainTimeout);
      videoState.startAgainTimeout = setTimeout(initiateStream, 250);
    }
  };
  
  // When the page goes into the background, pause the camera
  const handleVisibilityChange = () => {
    if (document.hidden) {
      if (videoState.streaming) {
        transitionStart();
        videoState.stream.getTracks().forEach((trk) => trk.stop());
        videoState.streaming = false;
      }
    } else {
      initiateStream();
    }
  }
  
  const copyToClipboard = async (text) => {
    try {
      // Ask permission
      const permission = await navigator.permissions.query({name: "clipboard-write"});
      // If 'granted' or 'prompt' attempt to write to clipboard
      if (permission.state === 'granted' || permission.state === 'prompt') {
        navigator.clipboard.writeText(text);
      }
    } catch (e) {
      console.log(`Error copying to clipboard`, e);
    }
  }
  
  // Clear the canvas, hide the output and show the video
  const clearPhoto = () => {
    transitionStart();
    const ctx = elements.canvas.getContext('2d');
    ctx.fillStyle = '#457B9D';
    ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
  
    const data = canvas.toDataURL('image/png');
    elements.photo.setAttribute('src', data);
    elements.camera.style.display = 'inline-block';
    elements.output.style.display = 'none';
    elements.downloadButton.style.display = 'none';
    elements.startButton.style.display = 'block';
    elements.flipButton.style.display = 'block';
    elements.restartButton.style.display = 'none';
    videoState.reading = true;
    if (videoState.processImgInterval) clearInterval(processImgInterval);
    setInterval(processImg, 250);
    setTimeout(transitionEnd, 250);
  };
  
  // Use the video element as the source to draw an image on our canvas element
  // Hide the video, show the output
  const takePicture = (callback) => {
    transitionStart();
    const ctx = elements.canvas.getContext('2d');
    const width = elements.video.videoWidth;
    const height = elements.video.videoHeight;
    if (width && height) {
      elements.canvas.width = width;
      elements.canvas.height = height;
      ctx.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);
      const data = canvas.toDataURL('image/png');
      elements.photo.setAttribute('src', data);
      elements.output.style.display = 'inline-block';
      elements.camera.style.display = 'none';
      elements.startButton.style.display = 'none';
      elements.flipButton.style.display = 'none';
      elements.restartButton.style.display = 'block';
      elements.downloadButton.style.display = 'unset';
      setTimeout(transitionEnd, 250);
      if (callback) {
        setTimeout(callback, 500);
      }
    } else {
      clearPhoto();
    }
  };
  
  const processImg = () => {
    if(videoState.reading) {
      const ctx = elements.canvas.getContext('2d');
      const width = elements.video.videoWidth;
      const height = elements.video.videoHeight;
      if (width && height) {
        elements.canvas.width = width;
        elements.canvas.height = height;
        ctx.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);
        const imageData = ctx.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
        if (elements.canvas.width && elements.canvas.height) {
          videoState.channel.postMessage({
            type: 'PROCESS',
            input: {
              width: elements.canvas.width,
              height: elements.canvas.height,
              imageData: imageData,
            },
          });
        }
      }
    }
  };
  
  const downloadImage = (data, filename = 'untitled.jpeg') => {
    const link = document.createElement('a');
    link.href = data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  };
  
  const flipCamera = async () => {
    videoState.facingUser = !videoState.facingUser;
    if (videoState.streaming) {
      transitionStart();
      videoState.stream.getTracks().forEach((trk) => trk.stop());
      videoState.streaming = false;
    }
    let opts = { video: true, audio: false };
    if (videoState.supportsFacing) {
      opts.video = { facingMode: videoState.facingUser ? 'user' : 'environment' }
    } else {
      const tracks = videoState.stream.getVideoTracks();
      if (tracks.length > 0) {
        const curDevice = tracks[0].label;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput' && d.label !== curDevice);
        opts.video = { deviceId: videoDevices[0].deviceId };
      }
    }
    initiateStream(opts);
  };
  
  const checkCameras = async () => {
    try {
      // check whether we can use facingMode
      const supports = navigator.mediaDevices.getSupportedConstraints();
      if (supports.facingMode === true) {
        videoState.supportsFacing = true;
        elements.flipButton.style.display = 'block';
        elements.flipButton.addEventListener('click', flipCamera);
        return;
      }
  
      // check if multiple cams
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      if (videoDevices.length > 1) {
        elements.flipButton.style.display = 'block';
        elements.flipButton.addEventListener('click', flipCamera);
        return;
      }
    } catch (e) {
    }
  }
  
  const initiateStream = async (opts) => {
    try {
      const strm = await navigator.mediaDevices.getUserMedia(opts || { video: true, audio: false });
      videoState.stream = strm;
      elements.video.srcObject = strm;
      elements.video.play();
      calculateSize();
      transitionEnd();
      if (videoState.processImgInterval) clearInterval(processImgInterval);
      setInterval(processImg, 250);
    } catch (e) {
      console.log('An error occurred: ' + e);
      elements.animateSwitch.style.backgroundColor = '#E63946';
      elements.animateSwitch.style.opacity = 1;
      elements.startButton.disabled = true;
    }
  };
  
  const startStream = () => {
    if (!videoState.streaming) {
      calculateSize();
  
      // Set all the elements to the calculated values and set the streaming variable to true
      Object.keys(elements)
        .filter((k) => !buttons.includes(k))
        .forEach((k) => {
          const elmnt = elements[k];
          if (elmnt.style) {
            elmnt.style.width = `${videoState.width}px`;
            elmnt.style.height = `${videoState.height}px`;
          }
        });
      videoState.streaming = true;
    }
  };
  
  const transitionStart = () => (elements.animateSwitch.style.opacity = 1);
  const transitionEnd = () => (elements.animateSwitch.style.opacity = 0);
  
  const startup = () => {
    // Grab our elements from the DOM
    elements.animateSwitch = document.querySelector('.animate-switch');
    elements.video = document.querySelector('#video');
    elements.camera = document.querySelector('.camera');
    elements.canvas = document.querySelector('#canvas');
    elements.photo = document.querySelector('#photo');
    elements.startButton = document.querySelector('#start');
    elements.restartButton = document.querySelector('#restart');
    elements.downloadButton = document.querySelector('#download');
    elements.flipButton = document.querySelector('#switch-camera');
    elements.output = document.querySelector('.output');
    elements.cameraContainer = document.querySelector('.camera-container');
    checkCameras();
    transitionStart();
  
    // Attach the window resize handler after, so we have an instance of the elements first
    window.addEventListener('resize', handleResize);
  
    // Set up visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
  
    // Start the video and request video permissions
    initiateStream();
  
    // Set up the event handlers for when we get a stream
    elements.video.addEventListener('canplay', startStream, false);
  
    elements.startButton.addEventListener('click', (e) => {
      e.preventDefault();
      takePicture();
    });
  
    elements.restartButton.addEventListener('click', (e) => {
      e.preventDefault();
      clearPhoto();
    });
  
    elements.downloadButton.addEventListener('click', (e) => {
      e.preventDefault();
      downloadImage(elements.canvas.toDataURL(), `Snap ${new Date().toLocaleString()}`);
    });
  };
  
  videoState.channel.onmessage = (event) => {
    if (event && event.data.type === 'PROCESS' && event.data.result) {
      if (videoState.processImgInterval) clearInterval(processImgInterval);
      videoState.reading = false;
      if (videoState.showResultsTimeout) clearTimeout(videoState.showResultsTimeout);
      videoState.showResultsTimeout = setTimeout(() => {
        console.log('QRCode Data: ', event.data.result);
        copyToClipboard(event.data.result);
        takePicture(() =>
          ons.notification.toast(event.data.result, {
            timeout: 500,
          })
        );
      }, 500);
    }
  };
  
  // Set up our event listener to run the startup process once loading is finished
  document.addEventListener('init', startup)
  