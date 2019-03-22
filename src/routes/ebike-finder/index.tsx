import { h, Component, FunctionalComponent } from 'preact';
const style = require('./style');
interface Station {
  lon: number;
  lat: number;
  address: string;
  name: string;
  station_id: string;
  distance?: number;
  status: StationStatus;
}
interface Coords {
  lon: number;
  lat: number;
}
interface StationStatus {
  station_id: string;
  num_bikes_available: number;
  num_docks_available: number;
  is_installed: number;
  is_renting: number;
  is_returning: number;
  last_reported: number;
  num_bikes_available_types: {
    classic: number;
    smart: number;
    electric: number;
  };
}

export class EbikeFinder extends Component<any, { closestStation: Station }> {
  getLocation() {
    window.navigator.geolocation.getCurrentPosition(
      async position => {
        const { coords } = position;
        const [stations, stationStatuses] = await Promise.all([
          this.getStations(),
          this.getStationStatus()
        ]);
        const distances = stations
          .map(s => {
            const delta = this.distanceFrom(
              { lat: coords.latitude, lon: coords.longitude },
              s
            );
            s.distance = delta;
            const status = stationStatuses.filter(
              status => s.station_id === status.station_id
            )[0];
            s.status = status;
            return s;
          })
          .sort((a, b) => (a.distance < b.distance ? -1 : 1));
        const [ebike] = distances.filter(
          d => d.status.num_bikes_available_types.electric !== 0
        );
        this.setState({
          closestStation: ebike || distances[0]
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }
  toRad(num: number) {
    return (num * Math.PI) / 180;
  }
  distanceFrom(from: Coords, to: Coords) {
    const R = 6371; // km
    const dLat = this.toRad(from.lat - to.lat);
    const dLon = this.toRad(from.lon - to.lon);
    const lat1 = this.toRad(to.lat);
    const lat2 = this.toRad(from.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  async getStations() {
    const url =
      'https://gbfs.bcycle.com/bcycle_heartland/station_information.json';
    const res = await fetch(url);
    const asJson = await res.json();
    return asJson.data.Stations as Station[];
  }
  async getStationStatus() {
    const url = 'https://gbfs.bcycle.com/bcycle_heartland/station_status.json';
    const asJson = await fetch(url).then(res => res.json());
    return asJson.data.stations as StationStatus[];
  }
  render() {
    return (
      <div class={style.page}>
        <h1>EBIKES</h1>
        <button onClick={() => this.getLocation()}>Get location</button>
        {this.state.closestStation ? (
          <Position station={this.state.closestStation} />
        ) : null}
      </div>
    );
  }
}

interface PositionProps {
  station: Station;
}
const Position: FunctionalComponent<PositionProps> = ({
  station
}: PositionProps) => {
  return (
    <div>
      <h1>{station.name}</h1>
      <p>is the closest B-Cycle location</p>
      <h3>{Math.round(station.distance * 10) / 10} km away</h3>
      <h3>
        {station.status.num_bikes_available} bikes available,{' '}
        {station.status.num_bikes_available_types.electric} ebikes
      </h3>
    </div>
  );
};
