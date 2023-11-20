// export function handleDiffPercantegeInput(e, fn) {
//     console.log("adasdasdasdasd")
//     if (isNaN(e.target.value)) {
//       return;
//     }
//     const onlyNums = e.target.value.replace(/[^0-9]/g, "");
//     fn(parseFloat(onlyNums));
//   }

export  function drawResults(canvasCtx, results, treshold) {
    for (let i = 0; i < results.length; i++) {
        if (results[i].score*100 < treshold) continue;
        canvasCtx.beginPath();
        canvasCtx.rect(...results[i].bbox);
        canvasCtx.lineWidth = 1;
        canvasCtx.strokeStyle = 'green';
        canvasCtx.fillStyle = 'green';
        canvasCtx.stroke();
        canvasCtx.fillText(
            results[i].score.toFixed(3) + ' ' + results[i].class, results[i].bbox[0],
            results[i].bbox[1] > 10 ? results[i].bbox[1] - 5 : 10);
    }
  }


  export function calculateDifferencePercentage(imgData1, imgData2, threshold=10) {
    const totalPixels = imgData1.data.length / 4; // Each pixel has 4 values (RGBA)
  
    let differentPixels = 0;
  
    for (let i = 0; i < imgData1.data.length; i += 4) {
      // Compare pixel values (R, G, B)
      const pixelDiff =
        Math.abs(imgData1.data[i] - imgData2.data[i]) +
        Math.abs(imgData1.data[i + 1] - imgData2.data[i + 1]) +
        Math.abs(imgData1.data[i + 2] - imgData2.data[i + 2]);
  
      // If the pixel difference is above the threshold, consider it a difference
      if (pixelDiff > threshold) {
        differentPixels++;
      }
    }
  
    // Calculate percentage difference
    const percentageDifference = (differentPixels / totalPixels) * 100;
    return percentageDifference.toFixed(2);
  }