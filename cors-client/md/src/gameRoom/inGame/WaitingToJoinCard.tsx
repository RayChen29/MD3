import{useEffect, useState} from 'react';
export default function WaitingToJoinCard () {
    const [nrDots,setNrDots] = useState(0);//todo: implement an interval/timer system
    useEffect(() => {
        // Set up an interval to update the number of dots every 800ms
        const interval = setInterval(() => {
            setNrDots((prevDots) => (prevDots + 1) % 5); // Reset to 0 after 4 dots
        }, 800);

        // Clean up the interval on component unmount
        return () => clearInterval(interval);
    }, []); // Empty dependency array to run only on mount/unmount

    const displayedDots = (): string => '.'.repeat(nrDots);

    return (
        <>
            <div className="waitingOverlay">
                <div className="waitingBox">
                    <h3>Please Wait{displayedDots()}</h3>
                    <h2>Players Connected:</h2>
                </div>
            </div>
        </>
    )
};