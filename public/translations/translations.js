$(document).ready(function () {
    var lang;
    var translations = JSON.parse(localStorage.getItem('translations'));
    var lang_temp;
    var index;

    // Check if translation exists, then auto translate the page based on last selection
    if(translations){
        index = localStorage.getItem('langIndex');
        $('#lang-controller>option:eq('+index+')').prop('selected', true);
        translate();
    }

    // New translation selected
    $('select.lang-wrapper').change(function () {
        lang = $(this).children('option:selected').attr('id');
        index = $(this).children('option:selected').attr('index');

        if (!translations) {
            getLang();
            
        }else{
            var lang_temp = localStorage.getItem('lang');

            // translations exists
            if(lang_temp != lang){
                localStorage.clear();
                getLang();
            }else{
                console.log("here")
                translate();
            }
        }
    });

    function translate(){
        // Will loop as many elements as found on the page with class .lang to translate them
        $('.lang').each(function (index, item) {
            $(this).text(translations[$(this).attr('key')]);
        });
    }

    function getLang(){
        $.getJSON('translations/' + lang + '.json', function (data) {
            translations = data;
            lang_temp = lang;
            localStorage.setItem('translations', JSON.stringify(translations));
            localStorage.setItem('lang', lang_temp);
            localStorage.setItem('langIndex', index);

            translate();
        });
    }
});