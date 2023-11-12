import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Map, { NavigationControl, Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import Backdrop from "@mui/material/Backdrop";

const LeafletMap = () => {
  const [open, setOpen] = React.useState(true);
  const handleClose = () => {
    setOpen(false);
  };
  const handleOpen = () => {
    setOpen(true);
  };
  return (
    <Fragment>
      <Map
        initialViewState={{
          longitude: 11.553597,
          latitude: 48.179488,
          zoom: 18,
        }}
        reuseMaps
        styleDiffing
        antialias
        preserveDrawingBuffer
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
        }}
        mapStyle='/api/style'
      >
        <NavigationControl position='top-left' />
        <PositionMarker notice={open} />
      </Map>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={open}
        onClick={handleClose}
      >
        <Button variant='contained' onClick={handleClose}>
          Start
        </Button>
      </Backdrop>
    </Fragment>
  );
};

export default LeafletMap;

import AHRS from "ahrs";
import Image from "next/image";
import { Button } from "@mui/material";

const PositionMarker: React.FC<{ notice: boolean }> = ({ notice }) => {
  const [position, setPosition] = useState<[number, number]>([
    11.553597, 48.179488,
  ]);
  const [geoData, setGeoData] = useState({
    gx: 0,
    gy: 0,
    gz: 0,
    ax: 0,
    ay: 0,
    az: 0,
  });

  const [madwick] = useState(
    () =>
      new AHRS({
        sampleInterval: 20,
        algorithm: "Madgwick",
        beta: 0.4,
        kp: 0.5,
        ki: 0,
        doInitialisation: false,
      })
  );
  const { heading, pitch, roll } = madwick.getEulerAngles();
  useEffect(() => {
    const { ax, ay, az, gx, gy, gz } = geoData;
    madwick.update(gx, gy, gz, ax, ay, az);
  }, [geoData, madwick]);
  const handleOrientation = useCallback(function (event: any) {
    const { webkitCompassHeading, beta, gamma } = event;

    requestAnimationFrame(() => {
      setGeoData((prev) => ({
        ...prev,
        gx: webkitCompassHeading,
        gy: beta,
        gz: gamma,
      }));
    });
  }, []);

  const handleOrientationAndroid = useCallback((event: any) => {
    const { alpha, beta, gamma } = event;
    requestAnimationFrame(() => {
      setGeoData((prev) => ({
        ...prev,
        gx: alpha,
        gy: beta,
        gz: gamma,
      }));
    });
  }, []);
  const handleMotion = useCallback(function (event: any) {
    const {
      accelerationIncludingGravity: { x, y, z },
    } = event;
    requestAnimationFrame(() => {
      setGeoData((prev) => ({
        ...prev,
        ax: x,
        ay: y,
        az: z,
      }));
    });
  }, []);

  const askPermission = useRef<boolean>(true);
  useEffect(() => {
    if (notice && askPermission.current) {
      const tmpIos =
        navigator.userAgent.match(/(iPod|iPhone|iPad)/) &&
        navigator.userAgent.match(/AppleWebKit/);
      askPermission.current = false;
      if (tmpIos) {
        let hasRequestPermission = false;
        try {
          hasRequestPermission =
            typeof DeviceOrientationEvent !== "undefined" &&
            //@ts-expect-error
            typeof DeviceOrientationEvent.requestPermission === "function" &&
            typeof DeviceMotionEvent !== "undefined" &&
            //@ts-expect-error
            typeof DeviceMotionEvent.requestPermission === "function";
        } catch (error) {
          hasRequestPermission = false;
        }

        if (!hasRequestPermission) return;
        //@ts-expect-error
        DeviceOrientationEvent.requestPermission()
          .then((response: any) => {
            if (response === "granted") {
              window.addEventListener(
                "deviceorientation",
                handleOrientation,
                true
              );
            } else {
              alert("has to be allowed!");
            }
          })
          .catch((err: any) => alert(err));
        //@ts-expect-error
        DeviceMotionEvent.requestPermission()
          .then((response: any) => {
            if (response === "granted") {
              window.addEventListener("devicemotion", handleMotion, true);
            } else {
              alert("has to be allowed! motion");
            }
          })
          .catch((err: any) => alert(err));
      } else {
        window.addEventListener(
          "deviceorientationabsolute",
          handleOrientationAndroid,
          true
        );
        window.addEventListener("devicemotion", handleMotion, true);
      }
    }
    // }
  }, [notice, handleMotion, handleOrientation, handleOrientationAndroid]);
  return (
    <Marker rotation={heading} latitude={position[1]} longitude={position[0]}>
      <Image
        alt=''
        height={40}
        width={40}
        src='https://icons.veryicon.com/png/o/miscellaneous/xdh-font-graphics-library/direction-17.png'
      />
    </Marker>
  );
};
