window.addEventListener('load', init);
//TODO : 추후에 서비스키는 다른 파일에 한꺼번에 저장하고 불러오는 형식으로 한다.

/** 
 * @var {Object} busData 버스의 현재 위치 정보
 * @var {Object} busRouteData 버스 경로 정보(노선)
 * @const serviceKey 서비스키
 */
const serviceKey = "?ServiceKey={Your Service Key}";
var busData;
var busRouteData;


/**
 * @fires window#load
 */
function init() {
/**
 * @event window#load
 */
    $('#busInput').on('click', function () {
        $('#get30')[0].checked = false;
        let in_TextBox = $('#busNumber').val();
        let url = "http://ws.bus.go.kr/api/rest/busRouteInfo/getBusRouteList";
        numberChangeHandler(url, in_TextBox, 1);
    }); // 버스 목록 버튼
    $('#busSelect').on('change', function () {
        $('#get30')[0].checked = false;
        let in_TextBox = (this.value);
        //.split(','); // 0 : routeId, 1 : stStationNm, 2 : edStationNm
        let url = "http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid";
        numberChangeHandler(url, in_TextBox, 2);




    }); //버스 목록 클릭인 경우.
    $('#get30').on('change', function () {
        let checkInterval = "";

        if (this.checked) {

            if (($('#busNumber').val() == "")) {
                alert('검색을 하지 않았습니다.');
                this.checked = false;
                return;
            }
            if ($('#busSelect')[0].selectedIndex == 0) {
                alert('선택된 항목이 없습니다.');
                this.checked = false;
                return;
            }
            else {
                let in_TextBox = $('#busSelect')[0].selectedOptions[0].value;
                checkInterval = setInterval(function () {
                    let url = "http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid";
                    numberChangeHandler(url, in_TextBox, 2);
                }, 10000);
            }

        }
        else {
            clearInterval(checkInterval);
        }
    }); //30초마다 반복 체크 기능 (numberChangeHandler 가 반복됨.)
}

/**
 * 버스 검색, select 이벤트 후에 넘어오는 기능. 
 * @param {string} url 해당되는 API를 사용하기 위한 url
 * @param {string} in_Text 사용자가 입력한 버스번호 혹은 busID
 * @param {int} flag 0 = 사용자의 버스번호 입력인 경우. || 1 = 사용자가 select에 선택한 busID
 */
function numberChangeHandler(url, in_Text, flag) {

    if (flag == 1) {
        if (isNaN(in_Text)) {
            alert("not number");
            return;
        }
        let busNumber = "&strSrch=" + in_Text;
        let generatedUrl = url + serviceKey + busNumber;
        xmlParser(generatedUrl, BusRouteId);
    }//버스 번호 찾는 경우
    else if (flag == 2) {
        let busRoute = "&busRouteId=" + in_Text;
        let generatedUrl = url + serviceKey + busRoute;
        xmlParser(generatedUrl, BusLocation);
        busPathPrepareLoad();

    }//버스 리스트 클릭인 경우
}

/**
 * 각 url을 가지고 fetch 하는 기능을 수행
 * 주의! fetch 기능은 ie에선 지원하지 않음. {@link http://caniuse.com/#search=fetch} 참고
 * @param {string} xmlUrl 사용자가 찾으려는 버스 정보를 가지고 있는 URL
 * @param {string} handler 각 기능에 맞는 handler 함수 이름
 */
function xmlParser(xmlUrl, handler) {
    fetch(xmlUrl)
        .then(res => res.text())
        .then(handler)
        .catch((error) => {
            alert("error  " + error);
        });
}

/**
 * 버스 노선경로를 그리기 위한 사전 준비 함수. 
 * {@link numberChangeHandler} 에서 버스 리스트 클릭시 실행된다.
 */
function busPathPrepareLoad() {

    let in_TextBox = $('#busSelect')[0].selectedOptions[0].value;
    let busRoute = "&busRouteId=" + in_TextBox;
    let url = "http://ws.bus.go.kr/api/rest/busRouteInfo/getRoutePath";
    generatedUrl = url + serviceKey + busRoute;
    xmlParser(generatedUrl, BusRoutePath);

}

/**
 * 사용자가 버스 번호를 입력하고 검색할 때 실행되는 핸들러.
 * 자세한 xml 결과는 Day 16, 17 문서중 4쪽 참고
 * @param {response} res 해당되는 버스 id 값들의 xml
 */
function BusRouteId(res) {
    let busSelectList = document.getElementById('busSelect');
    busSelectList.options.length = 0;

    let serchItemList = $(res).find('itemList');
    let busIdList = [];

    let defaultOption = document.createElement('option');
    defaultOption.disabled = true;
    defaultOption.text = "아래 항목에서 선택해주세요.";
    defaultOption.value = null;
    busSelectList.add(defaultOption);

    for (let i = 0; i < serchItemList.length; i++) {    
        let option = document.createElement('option');
        busIdList.push(serchItemList.find('busRouteId')[i].textContent);
        option.text = "버스번호: " + (serchItemList.find('busRouteNm')[i].textContent);
        option.value = (serchItemList.find('busRouteId')[i].textContent);
        // + "," + (serchItemList.find('stStationNm')) + ","+ (serchItemList.find('edStationNm')); 추후 상행, 하행을 나눌때 이용 day16,17 문서 참고

        busSelectList.add(option);
    }
    $('#busSelect').find("option:first").attr("selected", true);
}

/**
 * 사용자가 select 에서 원하는 버스를 선택할 때 실행되는 핸들러
 * 자세한 xml 결과는 Day 16, 17 문서중 5쪽 참고
 * @param {response} res 운행되고 있는 bus들의 위,경도 번호 등등의 xml 
 */
function BusLocation(res) {
    let serchItemList = $(res).find('itemList');

    if (serchItemList.length == 0) {
        alert("운행중인 버스가 없습니다.");
        return;
    }

    let bus_gpsX = [];
    let bus_gpsY = [];
    let bus_plainNo = [];
    // let bus_vehId = [];
    // let bus_lastStnId;

    for (let i = 0; i < serchItemList.length; i++) {
        bus_gpsX.push(serchItemList.find('gpsX')[i].textContent);
        bus_gpsY.push(serchItemList.find('gpsY')[i].textContent);
        bus_plainNo.push(serchItemList.find('plainNo')[i].textContent);
        //  bus_vehId.push(serchItemList.find('vehId')[i].textContent);
    }
    //  bus_lastStnId = serchItemList.find('lastStnId')[0].textContent;

    //bus_vehId, bus_lastStnId 는 추후에 필요하면 주석을 제거후 활용.
    busData = {
        busGpsX: bus_gpsX,
        busGpsY: bus_gpsY,
        busPlainNo: bus_plainNo
    };
    positionForMarker();
}

/**
 * 사용자가 bus노선 보이기 버튼을 눌렀을 때 실행되는 핸들러.
 * 자세한건 Day 27 문서 참고
 * @param {response} res 각 버스 경로들을 가지고 있는 xml 문서
 */
function BusRoutePath(res) {
    let serchItemList = $(res).find('itemList');
    let posXs = serchItemList.find('gpsX');
    let posYs = serchItemList.find('gpsY');

    let bus_gpsX = [];
    let bus_gpsY = [];

    for (let i = 0; i < serchItemList.length; i++) {
        bus_gpsX.push(posXs[i].textContent);
        bus_gpsY.push(posYs[i].textContent);
    }

    busRouteData = {
        busRoutePosX: bus_gpsX,
        busRoutePosY: bus_gpsY
    };
}
