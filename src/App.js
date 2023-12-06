import React, { useState, useEffect, useRef } from "react";
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import './App.css';
import VideoPlayer from "./video_player_component/video_player_component";

const App = () => {


  return (
    <div className='main'>
        <div className='header'>Header</div>
        <VideoPlayer className='video_player'/>
        <div className='diagrams'>Diagrams</div>
        <div className='settings'>Settings</div>
        <div className='ads'>Google ads</div>
    </div>
  );
};

export default App;
