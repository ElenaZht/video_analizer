import React, { useState, useEffect, useRef } from "react";
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import './App.css';

import * as cocoSsd from '@tensorflow-models/coco-ssd';
import {drawResults, calculateDifferencePercentage} from './utils';


const VIDEO_WIDTH=640;
const times= [];
const totaltimes = [];
let prevFrameImageData = null;

// TODO find why the player reloaded after every not related state change like checkbox

const VideoPlayer = () => {

  const [videoFile, setVideoFile] = useState(null); // the actual video file
  const [model, setModel] = useState(null);         // state of Object detection model
  const canvasRef = useRef();
  const vidRef = useRef(null);
  
  // true if scanning only frames with motion
  const [motionOnlyChecked, setMotionOnlyChecked] = useState(false);
  // frames difference threshold, used fro motion detection
  const [diffTreshold, setDiffTreshold] = useState(10);
  // detection confidence threshold
  const [detectionTreshold, setDetectionTreshold] = useState(60);

  // for counting detected object by types
  let objectsCounter = {};

  const handleMotionCheckboxChange = () => {
    setMotionOnlyChecked(!motionOnlyChecked);
  };

  useEffect(() => {
    async function loadModel() {
      setModel(await cocoSsd.load());
    }
    loadModel();
  }, []);

  const handleFileUpload = event => {
    setVideoFile(event.target.files[0]);
  };


  const calcAvg = e => {
    // calculates average detection time per frame.
    const avgTimeMs = (times.reduce((a, b) => a + b, 0) / times.length)/1000;
    const fps =  1/(avgTimeMs)
    console.log("avg detect time: ", avgTimeMs, "s ,FPS: ~", fps);
  }

  // const pause = e => {
  //   // vidRef.current.pause();
  //   // not possible to pause video by "pause" because we jumping in the video by time steps
  //   // for pausing need to add new state varible and to use it in stepForward method
  //   // TODO
  // }

  const play = event => {
    // vidRef.current.play();
    // trigger the start of processing
    stepForward();
  }

  const stepForward = event => {
    // changing the "currentTime" of video element causes to video to seek to this time.
    // we using this approach in order to process video quickly (few frames per second
    const newTime = vidRef.current.currentTime + 0.5;
    if (newTime < vidRef.current.duration) {
      vidRef.current.currentTime =  vidRef.current.currentTime + 0.5;
      // console.log(`New time is ${vidRef.current.currentTime} / ${vidRef.current.duration}`);
    } else if (vidRef.current.currentTime < vidRef.current.duration) {
      // TODO chec if needed to validate if we reached the end.
      vidRef.current.currentTime = vidRef.current.duration;
    }
  }

  const changeDetectionTreshold = (event) => {
    setDetectionTreshold(event.target.value);
  };
  const changeDiffTreshold = (event) => {
    setDiffTreshold(event.target.value);
  };

  return (
    <div className='main'>
        <div className='header'>Header</div>
        <div className='video_player'>

            <canvas id="preview" ref={canvasRef}></canvas>
            {videoFile && (
              <video controls width="640px" height="auto" style={{display:"none"}} ref={vidRef}
                src={URL.createObjectURL(videoFile)}
                // autoPlay  // disabled because we not playing video, just jumping by time steps
                onLoadedMetadata={event => {
                  // This happens when video file is loaded to the video player.
                  // We need to init canvas and to register processing callback every time change of the video.

                  // getting refs for video and canvas
                  const video = event.target;
                  const canvas = canvasRef.current;

                  // we want fast processing, for this we need to downscale video to the canvas.
                  // we know that detector works well for width 640 pixels. But need to maintain aspect
                  // ratio of original video, so we calculate the canvas height accordingly

                  canvas.width = VIDEO_WIDTH; //video.videoWidth;
                  const ratio = video.videoWidth / video.videoHeight;
                  canvas.height = VIDEO_WIDTH/ ratio; //video.videoHeight;

                  const ctx = canvas.getContext("2d",  {willReadFrequently: true });
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  // ctx.globalAlpha = 0.5; // for opactity controlr

                  console.log("videoWidth: ", video.videoWidth);
                  console.log("videoHeight: ", video.videoHeight);

                  // clear statistics
                  times.length = 0;
                  totaltimes.push(Date.now());
                  objectsCounter = {};


                  // register the proccessing callback for every time change of the video
                  video.addEventListener("timeupdate", async function(event) {
                    const start = Date.now(); //get time for stats

                    // draw the video frame on the canvas
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);


                    let framesDiff = undefined;
                    // if detection only for frames with motion
                    if (motionOnlyChecked && prevFrameImageData) {
                      // if prevoius frame exists we calculate the percentage of diffirence beteen frames
                      framesDiff = calculateDifferencePercentage(prevFrameImageData, ctx.getImageData(0, 0, canvas.width, canvas.height));
                    }

                    // if motion is disabled (framesDiff === undefined) or diff higher than threshold from UI
                    if (framesDiff === undefined || framesDiff > diffTreshold) {

                      // store the frame for comparing with the next if motion is ON
                      if (motionOnlyChecked) {
                        prevFrameImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                      }

                      // run nueral network model (SSD-coco) on the canvas
                      // the response is array of objects like with next values:
                      // bbox - the coordinates of detected object
                      // class - the textual name of the object type
                      // score - the confidance score [0-1] of model that this object from this type.
                      // Example:
                      // {
                      //   "bbox": [105.45671463012695, 246.56474173069, 101.92558288574219, 74.66364789009094],
                      //   "class": "broccoli",
                      //   "score": 0.5747607946395874
                      // }

                      const results = await model.detect(canvas);

                      // draw the rectangulares with class name/score on the canvas.
                      // draw only objects that has score (confidance) higher than configured by UI
                      drawResults(ctx, results, detectionTreshold);

                      // stats. count objects by type
                      for (let i = 0; i < results.length; i++) {
                        if (results[i].score*100 < detectionTreshold) continue;
                        if (results[i].class in objectsCounter){
                          objectsCounter[results[i].class]++;
                        } else {
                          objectsCounter[results[i].class]=1;
                        }
                      }

                      //get time for stats and store it
                      const end = Date.now();
                      times.push(end - start);
                    }

                    // call function that increases the current time of video.
                    // this will invoke this method again (if current time updated)
                    stepForward();
                  });

                  video.addEventListener("ended", async function() {
                    // called when we reaching the end of video
                    console.log("ended");
                    totaltimes.push(Date.now());
                    console.log(`Total processing time: ${(totaltimes[1]-totaltimes[0])/1000}s. Duration: ${vidRef.current.duration}s. Stopped time: ${vidRef.current.currentTime}`);
                    console.log("Total objects detected:", objectsCounter);
                    calcAvg();
                  });


                  video.addEventListener("play", async function() {
                    console.log("play event");
                    // objectsCounter = {};
                    // times.length = 0;
                    // totaltimes.length = 0;
                    // totaltimes.push(Date.now());
                  });

                  // video.addEventListener("seeking", async function() {
                  //   console.log("seeking");
                  // });
                }}
              />
            )}
            {/* <button onClick={pause}>Pause</button> */}
            <div className='controls'>
                <button onClick={play}>Play</button>
                <button onClick={stepForward}>Step Forward</button>
                <input type="file" onChange={handleFileUpload} />
            </div>
            <div className='treshold controls'>
                <div>
                    <input type="range" id="detector_threshold" name="detector_threshold" min="1" max="99"
                           value={detectionTreshold}
                           onChange={changeDetectionTreshold} />
                    <label htmlFor="detector_threshold">{detectionTreshold}% Detection threshold</label>
                </div>
                {/*Scan only frames with motion detected*/}
                {/*<input*/}
                {/*    type="checkbox"*/}
                {/*    checked={motionOnlyChecked}*/}
                {/*    onChange={handleMotionCheckboxChange}*/}
                {/*/>*/}
                <div>
                    <input type="range" id="diff_threshold" name="diff_threshold" min="1" max="99" disabled={!motionOnlyChecked}
                           value={diffTreshold}
                           onChange={changeDiffTreshold} />
                    <label htmlFor="diff_threshold">{diffTreshold}% frames diff threshold</label>
                </div>
            </div>



        </div>
        <div className='diagrams'>Diagrams</div>
        <div className='settings'>Settings</div>
        <div className='ads'>Google ads</div>
    </div>
  );
};

export default VideoPlayer;
