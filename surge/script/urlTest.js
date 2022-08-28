if (!$network.v4.primaryAddress) {
    console.log('节点定时测速，Surge未连接到网络')
	$done({})
}

var global_URLTestCount = "global_URLTestCount"
var global_URLTestDelayTotal = "global_URLTestDelayTotal"

cronUrlTest()

async function cronUrlTest() {
    
    var delay = await getUrlTestDelay();
    var urlTestCount = $persistentStore.read(global_URLTestCount)
    var urlTestDelayTotal = $persistentStore.read(global_URLTestDelayTotal)

    var delayMaxValue = 170
    if (urlTestCount != null && urlTestDelayTotal != null) {
        var avgDelay = parseInt(urlTestDelayTotal/urlTestCount)
        console.log(urlTestCount + "-" + avgDelay)
        if (urlTestCount > 50) {
            delayMaxValue = avgDelay
        }
    }

    if (delay < delayMaxValue) {
        console.log("节点定时测速，延迟" + delay + "ms，无需切换")
    } else {
        console.log("节点定时测速，延迟" + delay + "ms，执行切换")
        await url_test()
    }

    $done({})
}

function url_test() {
    return new Promise(resolve => {
        $httpClient.post({
            url: 'http://127.0.0.1:6171/v1/policy_groups/test',
            headers: {
                'X-Key': '123456',
                'Accept': '*/*'
            },
            body: '{"group_name": "Proxy"}'
        },
        function(error, response, data) {
            if (error) {
                console.log("节点定时测速，执行节点测速失败")
            } else {
                var result = JSON.parse(data)
                if (result.available != "") {
                    console.log("节点定时测速，测速后节点" + result.available)
                } else {
                    console.log("节点定时测速，测试后无可用节点")
                }
            }
            resolve()
        })
    })
}

function getUrlTestDelay() {
    var url = 'http://www.gstatic.com/generate_204'
    return new Promise(resolve => {
        $httpClient.head({ url: url },
        function(error, response, data) {
            var startTime = new Date()
            $httpClient.head({ url: url },
            function(error, response, data) {
                var delay = new Date() - startTime
                if (!error && delay > 100 && delay < 200) {
                    var urlTestCount = $persistentStore.read(global_URLTestCount)
                    var urlTestDelayTotal = $persistentStore.read(global_URLTestDelayTotal)
                    if (urlTestCount == null || urlTestDelayTotal == null) {
                        $persistentStore.write("1", global_URLTestCount)
                        $persistentStore.write(delay.toString(), global_URLTestDelayTotal)
                    } else {
                        $persistentStore.write((Number(urlTestCount) + 1).toString(), global_URLTestCount)
                        $persistentStore.write((Number(urlTestDelayTotal) + delay).toString(), global_URLTestDelayTotal)
                    }
                }
                resolve(error ? 5000 : delay)
            })
        })
    })
}