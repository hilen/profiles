// 疲劳度检测
var fatigueEndTime = $persistentStore.read("recaptcha_FatigueEndTime")
if (fatigueEndTime != null && new Date().getTime() < Number(fatigueEndTime)) {
    console.log('条件自动测速，多个节点请求 Google 均存在验证码')
    $done({})
}

var lastPolicy;
var urlTestNum = 0;

/*
和配置文件里的 http-api = 123456@127.0.0.1:6171 保持一致
policy_group 里的分组也保持一致
*/
// 获取当前选中节点
$httpClient.get({
    url: 'http://127.0.0.1:6171/v1/policy_groups/select?group_name=auto',
    headers: {
        'X-Key': '123456',
        'Accept': '*/*'
    }
}, 
function(error, response, data) {
    if (error) {
        $notification.post('条件自动测速', '', '获取当前选中节点失败')
        $done({})
    } else {
        lastPolicy = JSON.parse(data).policy;
        url_test();
    }
});

// 自动测速，最多尝试3次
function url_test() {
    $httpClient.post({
        url: 'http://127.0.0.1:6171/v1/policy_groups/test',
        headers: {
            'X-Key': '123456',
            'Accept': '*/*'
        },
        body: '{"group_name": "auto"}'
    },
    function(error, response, data) {
        urlTestNum = urlTestNum + 1;
        if (error) {
            if (urlTestNum <= 5) {
                // 再次尝试
                url_test();
            } else {
                $notification.post('条件自动测速', '', '自动测速失败')
                $done({})
            }
        } else {
            var result = JSON.parse(data);
            if (lastPolicy == result.available || result.available == "") {
                if (urlTestNum <= 3) {
                    // 再次尝试
                    url_test();
                } else {
                    $notification.post('条件自动测速', '', '3次测速结果均是' + lastPolicy)
                    $done({})
                }
            } else {
                $notification.post('条件自动测速', '', '已从' + lastPolicy + "切换到" + result.available)
                $persistentStore.write((new Date().getTime() + 3000).toString(), "recaptcha_FatigueEndTime")    
                $done({
                    response: {
                        status: 302,
                        headers: {
                            Location: getlinkPrams($request.url).continue
                        }
                    }
                })
            }
        }
    })
}

// 解析URL参数
function getlinkPrams(url) {
    url = url.split('#')[0];
    const objURL = {};
    url.replace(new RegExp('([^?=&]+)(=([^&]*))?', 'g'), (_$0, $1, _$2, $3) => {
      if ($3) { objURL[$1] = decodeURIComponent($3); }
      return $3;
    });
    return objURL;
}
